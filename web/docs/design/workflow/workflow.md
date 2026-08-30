# Workflow — 可视化工作流编排（受控三切片 + 回放器）

基于 [@xyflow/react](https://reactflow.dev/) + Ant Design 的可视化工作流画布与回放器。核心思想：**canonical DSL 是唯一事实源，画布是投影，编辑器与回放器共用同一 reducer**。

- 源码目录：`src/components/workflow/`
- 入口组件：[workflow.tsx](../../../src/components/workflow/workflow.tsx)
- 状态核心：[graph/](../../../src/components/workflow/graph/)
- 回放层：[replay/](../../../src/components/workflow/replay/)
- 类型生成：[workflow-dsl.ts](../../../src/generated/workflow-dsl.ts)（`npm run gen:dsl` 从 common 的 schema 生成）

## 受控三切片

`workflow_state` 由三个切片组成，页面（`useReducer`）持有，`Workflow` 组件只做投影与派发：

| 切片 | 内容 | 持久化 | 谁写 |
|---|---|---|---|
| `graph` | canonical DSL（nodes 的 config/input/output + edges 的 condition） | 存库（DSL） | reducer 图变更动作 |
| `view` | 节点位置 / 视口 | `meta.view`（`with_view` 写入） | `view/move_node` 等 |
| `runtime` | 节点七态 + 执行级状态 | 不落库 | `runtime/apply_event`（回放事件） |

- reducer：[reducer.ts](../../../src/components/workflow/graph/reducer.ts)（`workflow_reducer` + `workflow_action`）
- 投影：[react-flow-mapping.ts](../../../src/components/workflow/graph/react-flow-mapping.ts)（`project_stable` 供画布渲染——引用稳定投影并续持节点 `measured`；`from_canonical` / `to_canonical` round-trip 幂等，门禁 `verify-dsl-contract` 校验）
- 状态上下文：[workflow-state-context.ts](../../../src/components/workflow/graph/workflow-state-context.ts)（`useWorkflowState`，设置面板经它读写，不直连 React Flow store）

## 节点目录（dslType 统一）

`create_registry`（[node-registry.tsx](../../../src/components/workflow/nodes/node-registry.tsx)）声明 type → 组件/设置面板/菜单。`entry.type` 是 **DSL 节点类型**（`START/END/CONDITION/DEBUG/SCRIPT`，与后端 `NodeType` 唯一对齐），React Flow 节点 `type` 与之相同。节点数据：`node.data` 携带 canonical 字段 + 派生 `label`（config.name）+ `status`（runtime），画布外壳从 data 读取展示。**节点外壳背景恒为默认样式**，运行状态以「状态色边框（常驻 1px，仅换色不改尺寸）+ 标题行右侧状态pill（状态图标 + 耗时）」区分；待执行（wait）与未启动同视为中性；已成功节点在下方展示可展开的运行结果卡片（`node-result.tsx`，宽度对齐节点、底色不透明，展开为「节点名 运行结果」标题 + 输入/输出只读 `MonacoBody` code 编辑器 + tokens/耗时段脚）。调试节点（DEBUG）输出跟随 `jsonTemplate`，输出字段与模板顶层 key 自动对齐。

## 设置面板

面板（condition / output）经 `useWorkflowState()` 读 canonical 节点与条件边，编辑经 `dispatch` 落 DSL：

- `graph/update_node`：写节点的 config / input / output
- `graph/set_condition_edges`：条件节点整组替换出边（typed conditional edge）
- `graph/update_edge` / `connect_edge`：单边条件 / 连线

**图版本契约**：后端 `StateGraphCompiler` 按 `(workflowId, version)` 缓存编译结果，**DSL 内容变更必须递增 `version` 使缓存失效**。编辑器 reducer 在所有图结构变更动作上自动 `version + 1`（`view/*`、`runtime/*` 不递增），保证每次编辑后的运行都重编译、反映最新内容。

条件分支模型（`pages/workflow/nodes/condition/condition-operator.ts`）：前端分支对象 ↔ canonical `DslCondition` 的双向转换（`branch_to_condition` / `condition_to_branch`），分支是 CONDITION 节点的出边（`edge.condition`）。

字段交互语义（`extends/node-field/` 与设置面板）：
- 输出字段语义为「key 用别名映射为下游引用名」——`node.output` 的 `key` 是 JSON 模板顶层 key，`keyAlias` 是下游引用名（为空时落到 key）。新增输出字段不自动生成别名；填 key 且别名为空时自动同步 alias=key（`NodeField.syncAliasToValue`）；「完整」（key+alias 均填）输出才能被下游引用；同节点 alias 唯一。
- 内部引用（`INTERNAL_REF`）是下拉而非手填 id：`compute_internal_ref_options(nodeId, nodes, edges)`（`extends/node-field/node-field.ts`）沿入边逆向取全部上游节点输出，值为 `nodeId:refName`（`ref_name = keyAlias || key`）。条件分支的 compare 字段与输入字段均消费该选项。

## 回放器（live / replay 双模式）

[use-replay-state.ts](../../../src/components/workflow/replay/use-replay-state.ts)：

- **live**：`run()` 提交 DSL → `POST /api/workflow/execute` 得 runId → `EventSource` 订阅 `GET /api/workflow/{runId}/stream`（原生重连 + `Last-Event-ID` 续传）→ 每事件 `dispatch(runtime/apply_event)` 驱动七态
- **replay**：`load_replay()` 拉 `GET /api/workflow/{runId}/events` 历史 → 播放/步进/进度条按位置重放（reset 后按序重放 [0, position)）

服务客户端：[services/workflow.ts](../../../src/services/workflow.ts)（REST + SSE）。控制条与事件日志：[replay-controls.tsx](../../../src/components/workflow/replay/replay-controls.tsx)、[event-log.tsx](../../../src/components/workflow/replay/event-log.tsx)。

## 目录结构

```
src/components/workflow/
├── workflow.tsx                    受控画布主组件（ReactFlowProvider + 状态上下文）
├── components/workflow-canvas.tsx  画布主体（投影 + 派发 + useStore 读 nodeLookup）
├── graph/                          canonical 类型 / 纯函数 / 映射 / reducer / 上下文
├── nodes/                          create_registry / start / end / node-wrapper
├── components/                     Node 外壳 / 设置面板容器 / 边 / Handle / 菜单 / 状态样式
├── extends/node-field/             字段级引用 UI（CUSTOM / INTERNAL_REF / EXTERNAL_REF）
└── replay/                         use-replay-state / 控制条 / 事件日志
```
