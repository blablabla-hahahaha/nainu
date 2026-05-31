# Agent Note: 前端受控化重构与回放器（蓝图）

Status: proposed

## Problem

前端画布（`web/src/components/workflow/`）存在六项结构性问题，阻碍它承载愿景的「编辑器 + 回放器」双职责：① 节点类型身份断裂——UI type（`'start'` 小写）与后端 DSL type（`START` 大写）两套命名，注册表与后端 `NodeExecutorRegistry` 无对齐；② 双表示不对称——`node.data` 是 `Record<string, unknown>` 黑盒，设置面板把 form 值原样写入，与后端 `config/input/output` 结构化分列无契约；③ 单一数据源被破坏——`useNodesState` 内部持有 + 150ms debounce 外抛，父级不持有状态，无 undo/redo；④ 布局丢失——`toGraph` 丢弃 position，`fromGraph` 伪造位置，重开图乱序；⑤ 无回放层——七态（wait/runnable/suspended/failed/success/paused）没有任何生产者；⑥ 图类型手写（`graph/types.ts`）而非从 common 的 schema 生成，与后端契约漂移。

## Proposal

- **受控化**：`Workflow` 改为纯受控组件，canonical（DSL 形状）/ view（位置视口，持久化到 `meta.view`）/ runtime（节点状态，执行轨迹，不落库）三切片 + 单一 reducer；编辑器变更事件与回放事件走同一状态流。
- **统一节点目录**：`{ dslType, component, settingsPanel, inputSchema, outputSchema, deletable, connectable }`，`dslType` 与后端类型唯一对齐；`node.data` 拆为 `config/input/output` 并经 schema 校验。
- **回放层**：`POST /execute` 返回 `runId` 后 `GET /stream` 走原生 `EventSource`（自动重连 + `Last-Event-ID` 续传），`GET /events` 供历史回放；live / replay 双模式状态机；九事件 → 现有七态映射（零修改）。
- **契约**：`graph/types.ts` 由 `workflow-dsl.schema.json` 生成（`web/src/generated/workflow-dsl.ts` 已就绪）；round-trip 单测接入门禁。
- **services 层**：重建 workflow REST + SSE 客户端（现有 `services/chat.ts` 是残留，指向不存在的 `/ai` 端点）。

## Alternatives considered

**保持现状增量改（回放器另建旁路状态流）**：改动小但双源问题继续存在，回放与编辑两套逻辑。落选。
**契约层先行、编辑器后置**：可行但会拖延受控化的收益（回放器与编辑器共用 reducer）。当前按依赖序推进：契约层（已完成）→ 受控化 → 回放器。

## Acceptance criteria

- 编辑器受控化完成：canonical/view/runtime 三切片，节点目录 `dslType` 统一，`meta.view` 布局持久化。
- 回放器 live + replay 双模式消费事件流，断线经 `Last-Event-ID` 续传；`runtime` 切片与七态映射正确。
- `graph/types.ts` 由 schema 生成；round-trip 幂等单测通过并接入门禁。
- 前端 lint / tsc / build 全绿。

## Risks

- 重构面大：React Flow 内部状态（useNodesState/useEdgesState/onNodesChange）迁移到受控投影，画布交互（吸附、辅助线、连线）需回归验证。
- 回放器依赖后端 API 语义（九事件、seq、pause/resume at-least-once），语义变更需同步前端。
- 统一目录触及所有节点组件与设置面板，改动范围横跨 `pages/workflow/nodes/*`。
