# Agent Note: 前端受控化重构与回放器

Status: implemented

## Problem

前端画布（`web/src/components/workflow/`）存在六项结构性问题，阻碍它承载愿景的「编辑器 + 回放器」双职责：① 节点类型身份断裂——UI type（`'start'` 小写）与后端 DSL type（`START` 大写）两套命名，注册表与后端 `NodeExecutorRegistry` 无对齐；② 双表示不对称——`node.data` 是 `Record<string, unknown>` 黑盒，设置面板把 form 值原样写入，与后端 `config/input/output` 结构化分列无契约；③ 单一数据源被破坏——`useNodesState` 内部持有 + 150ms debounce 外抛，父级不持有状态，无 undo/redo；④ 布局丢失——`toGraph` 丢弃 position，`fromGraph` 伪造位置，重开图乱序；⑤ 无回放层——七态没有任何生产者；⑥ 图类型手写而非从 common 的 schema 生成，与后端契约漂移。

## Decision

[workflow.tsx](../../../../web/src/components/workflow/workflow.tsx) 是受控组件：页面用 `useReducer` 持有三切片（canonical `graph` / `view` / `runtime`），画布只做 ReactFlow 投影（[react-flow-mapping.ts](../../../../web/src/components/workflow/graph/react-flow-mapping.ts) 的 `project_stable`（引用稳定投影，供渲染）与 `from_canonical` / `to_canonical`（round-trip））与变更派发（[reducer.ts](../../../../web/src/components/workflow/graph/reducer.ts)）；设置面板经 `useWorkflowState()` 上下文读写，不再直连 React Flow store。节点目录 `entry.type` 统一为 DSL 类型（`START/END/CONDITION/DEBUG/SCRIPT`，与后端 `NodeType` 对齐）；节点数据拆分 canonical `config/input/output`，布局持久化到 `meta.view`（`with_view` / `get_view`）。回放层（[replay/](../../../../web/src/components/workflow/replay/)）：`services/workflow.ts` 提供 REST（execute/events/pause/resume）+ 原生 `EventSource` SSE（自动重连 + `Last-Event-ID` 续传），九事件经 `runtime/apply_event` 驱动七态；live（实时跟随）与 replay（历史播放/步进/进度）双模式共用同一 reducer。`graph/types.ts` 由 `workflow-dsl.schema.json` 生成（`web/src/generated/workflow-dsl.ts` 别名）；round-trip 幂等校验（[verify-roundtrip.ts](../../../../web/scripts/verify-roundtrip.ts)）接入 `verify-dsl-contract` 门禁。

## Alternatives considered

**保持现状增量改（回放器另建旁路状态流）**：改动小但双源问题继续存在，回放与编辑两套逻辑；与仓库红线「禁止同一数据源存多个 state」相悖。落选。
**契约层先行、编辑器后置**：可行但会拖延受控化的收益；实际按依赖序推进（契约层 → 受控化 → 回放器）。采用其顺序，未另立方案。

## Consequences

- 受控化后 React Flow 内部 store 仅作视图缓存，图状态单一事实源在页面 reducer；拖拽位置经 `view/move_node` 回流。画布投影（`WorkflowCanvas`）用引用稳定的 `project_stable` 并续持节点 `measured`，避免拖拽闪烁与全画布重渲染。
- runtime 切片不落库，保存 DSL 天然不含运行态；回放重放（reset 后按序重放）为 O(n²)，适合演示规模图。
- EventSource 断线自动重连、浏览器按事件 id 续传 `Last-Event-ID`，与后端 SSE（id=seq）契约一致；终态由 `EXECUTION_COMPLETED/FAILED` 事件关闭连接。
- 暂停为后端 graph-core 取消语义（at-least-once），前端事件流在恢复后继续，被中断节点的视觉状态由后续事件覆盖。
- 设置面板（condition/output）的数据读写契约改为 canonical（config/input/output + edge.condition），前端分支对象 ↔ `DslCondition` 转换收敛在 condition-operator.ts。
- `verify-dsl-contract` 门禁新增前端 round-trip 幂等检查（demo / 最小图 / 条件边图三用例），改动映射或 schema 后门禁即红。
