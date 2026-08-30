# Agent Note: 输出字段语义（别名映射）与内部引用下拉化

Status: implemented

## Problem

输出节点（DEBUG）与条件节点在「字段」交互上有两处不合预期：
1. 输出字段新增时自动生成随机别名（`short_uuid()`，如 `jcrfdgmn`），用户无法也无必要手动维护；复制粘贴改一处极易漏改。后端 DSL 本意是「把 JSON key 用别名映射为下游引用名」，但前端没有把这条语义显式做出来——别名要么缺省、要么随机。
2. 字段类型选「内部引用（INTERNAL_REF）」后，值是纯文本 id（如 `debug:username`）手动填写，要求用户硬背上游节点 id 与输出名。`NodeField` 其实已支持 `internal_ref_options` 下拉，但 `compute_upstream_outputs` 读错数据源（读 `data.outputs` 的 `{id,alias}`，实际是 canonical `data.output` 的 `{key,keyAlias}`），永远返回空数组；且条件分支的 compare 字段没有接 `internal_ref_options`，于是退化成文本。

## Decision

**输出字段语义**（对齐「key 用别名映射为下游引用名」）：
- 新增输出字段默认 `{ value: '', alias: '' }`，不再自动生成随机别名。
- 便捷交互：`NodeField` 新增 `syncAliasToValue`（输出字段开启）——填了 value 且别名为空时，自动把 alias 同步为 value；用户可保留（等同直接用 key 作引用名）或手动改名做映射。
- 「完整」输出（value 与 alias 均非空）才能被下游引用；同节点 alias 唯一。
- 校验：已添加的输出行须 value 非空且存在于 JSON 模板顶层、alias 非空、alias 不重复；输出列表允许为空（默认无输出，用户手动添加）。落 DSL：`key: value, keyAlias: alias`。

**内部引用下拉化**：
- 新增纯函数 `compute_internal_ref_options(nodeId, nodes, edges)`（`extends/node-field/node-field.ts`）：沿入边逆向遍历所有上游节点，取其 `output`，`ref_name = keyAlias || key`，产出 `{ label: "节点名 → refName", value: "nodeId:refName", ref_name }`——值格式与后端 `/` DSL 一致的 `nodeId:refName`（`debug:username`）。
- `NodeInputFields`（输出节点的入参）改经 `useWorkflowState().state.graph`（canonical 单一事实源）读取，并新增 `nodeId` prop 传入；删除基于 React Flow store 且读错形状的 `compute_upstream_outputs`。
- 条件分支 compare 字段：`ConditionSettings` 用 `compute_internal_ref_options(nodeId, ...)` 计算选项，经 `BranchOperatorForm` → `CompareOperatorForm` 传入，使字段与对比值的 `INTERNAL_REF` 都渲染成下拉；选中后把字段别名同步为 `ref_name`（落库 key 语义化而非随机串）。

## Alternatives considered

**只修 `compute_upstream_outputs` 数据形状、不接条件节点**：改动最小，但条件 compare 仍是文本，且继续读 React Flow store（违背「设置面板经 useWorkflowState 读 canonical，不直连 store」）；未采纳。

**内部引用下拉只列直接上游节点**：更简单，但条件节点常引用多跳前的输出（数据逐级流经），缩小到直接上游会丢失合法选项；未采纳。

**沿用 `keyAlias || key` 并在下拉里只显示有别名输出**：为兼容历史无别名输出，下拉用 `keyAlias || key`，故仍全量列出（无别名落到 key）。未再单列「仅完整输出」方案，因其自然等价于「有别名或用 key」。

## Consequences

- 新增输出字段为空行，填 value 自动同步 alias，用户可立刻保存且贴合「完整才能被引用」。
- 内部引用不再手填 id；条件 compare 的字段与对比值（若选 INTERNAL_REF）均可下拉选择，选完即落 `nodeId:refName`。
- 同节点别名唯一由校验保证，避免下游引用歧义。
- 输出字段「默认无输出」：新建 DEBUG 节点不预置输出行，用户按需添加；现有已填输出的节点照常加载。
- 代价：`node-field.ts` 现依赖 `graph/canonical` 的 `node_name` 与 `graph/types`（type-only），但 graph 不反向依赖 node-field，无循环；`NodeInputFields`/`ConditionSettings` 均改为读 canonical 图，画布与设置面板数据源单一。
