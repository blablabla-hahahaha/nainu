# Agent Note: 条件分支节点 input 未随出边条件派生（运行结果卡输入为空）修复

Status: implemented

## Problem

条件分支（CONDITION）节点真正消费的上游输出（如「指定输出 → username」）只写在**出边 condition**里，节点自身的 `input` 数组始终为空。导致三处不一致的用户可见现象：DSL 里状态分支节点没有输入、后端 `NODE_STARTED` 事件的输入快照是 `{}`、节点下方运行结果卡「输入」展示 `{}`——尽管它明显依赖了上游输出才能路由。

证据链（`web/src/components/workflow/graph/` 与 `nainu-agi-master/`）：

- DSL 契约把条件路由表示为 *typed conditional edge*（`edge.condition.field` 本身就是 `DslInputField`），而节点的输入建模在 `node.input`（`DsInputField[]`）上。两处是**同一语义字段却存在两个地方**，CONDITION 节点的输入因此无载体。
- `NodeActionAdapter.resolveInputs()`（后端）只遍历 `definition.getInput()` 解析 INTERNAL_REF；CONDITION 节点 `getInput()` 为空 → `resolvedInputs = {}` → `NODE_STARTED` 的 `input = {}`。
- 路由判断由 `StateGraphCompiler` 为条件边生成的集中式 router 完成，`ConditionEvaluator` 直接用 `state.readState(StateKeys.ofRef(field.value))` 读状态——**完全绕过节点解析好的 input**。所以流程能命中、能运行成功，但 `input` 全程为空，问题被「能跑通」掩盖（`NoopExecutor` 也不读输入）。
- 前端运行结果卡 `node.tsx` 传 `input={data?.input}`；`data` 是投影后的 canonical 节点，故展示的是**声明态 input 数组**而非运行时快照，CONDITION 节点为空数组 → `{}`。

根因是一处建模缺口：节点声明的输入没有跟随「它实际引用了哪些上游输出」自动保持同步。

## Decision

让条件分支节点的 `input` 从出边条件**自动派生**，成为与出边 condition 一致的只读事实。

- 新增纯函数 [canonical.ts](../../../../web/src/components/workflow/graph/canonical.ts) 的 `condition_node_input(edges)`：收集给定条件出边 `compare.field` 中类型为 `INTERNAL_REF` 的引用（按引用值去重），返回 `graph_input_field[]`。
- [reducer.ts](../../../../web/src/components/workflow/graph/reducer.ts) 的 `graph/set_condition_edges` 分支在替换出边时，把源节点（仅当类型为 CONDITION）的 `input` 置为该派生结果；图版本照常 `+1`。条件分支的整组出边只经这个 action 写入（`condition-settings.tsx` 的 `refresh_branches`），故「编辑条件即同步节点输入」的契约在此一处收敛。
- 演示数据同步预置条件节点输入，使开箱即见的效果即符合预期：前端演示图 [workflow-page.tsx](../../../../web/src/pages/workflow/workflow-page.tsx) 的 `condition` 节点、后端样例 [workflow-demo.json](../../../../nainu-agi-master/src/main/resources/workflow-demo.json) 的 `condition-node`。

后端路由与校验不需要改动：路由本就直读状态；`DslValidator` / `scripts/dsl-graph-rules.ts` 已分别校验 `node.input` 与条件边的 INTERNAL_REF 引用，派生后的引用必然通过。

## Alternatives considered

**在 `condition-settings.tsx` 面板内派生并另行 `graph/update_node` 写 input**：改动路径集中在面板，但把「条件分支输入 = 出边条件引用」这一不变量绑定到单个 UI 组件；一旦将来有其它路径写条件边（拖拽连线、导入），该不变量会再次失效。把它下沉到 reducer 的 `graph/set_condition_edges`（条件边唯一写入点）后，不变量随状态层保持，任何入口都成立。未采用面板方案。

**给条件分支节点加「输入字段」手动配置 UI（与 DEBUG/SCRIPT 一致）**：让用户手动声明输入。与其它节点的输入建模一致，但要求开发者重复录入分支出边里已经声明过的引用，且不自动跟随条件变更；违背「条件分支依赖某上游，那它就该是输入」的数据流直觉。未采用。

**在运行结果卡改读运行时 `NODE_STARTED` 快照（方案 B）**：通用地展示解析后的输入值，但改变**所有**节点运行结果卡的「输入」语义（声明态 → 运行时快照），改动面更大，且需要 reducer 保留 `event.input`。属独立增强，不随本次派生修复推进；派生后事件日志与运行结果卡均已能呈现条件节点的输入。

**后端在编译期强制补全 CONDITION 节点 input**：能在后端兜底手写 DSL，但把前端编辑器的「输入显示」语义耦合进后端图变换，且对已保存的手写 DSL 每编译一次都改一次对象，副作用与缓存键（workflowId, version）语义相冲突。未采用。

## Consequences

- 编辑条件分支（增删分支、改引用）后，CONDITION 节点的 `input` 随之更新，DSL 自描述；后端 `resolveInputs()` 据此把 `NODE_STARTED` 输入快照解析为实际值，事件日志与节点运行结果卡「输入」均可见所依赖的上游输出。
- 依赖项：条件分支输入 = 出边 condition 引用的 `INTERNAL_REF` 去重集合；ELSE 分支无表达式，不贡献输入。
- 既有已保存 DSL 里 INPUT 为空的 CONDITION 节点，还需在下次编辑条件时才被同步；一次性回填由持久化/迁移侧处理（本次未做）。
- 运行时路由不受影响（本就直读状态），`verify-dsl-contract`（JSON Schema + 图级规则 + round-trip）与后端校验均通过。
