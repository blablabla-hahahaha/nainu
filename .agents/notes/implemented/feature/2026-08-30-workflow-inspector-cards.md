# Agent Note: 右侧检查器两卡——节点配置 + 事件日志组合卡（执行记录|事件日志）

Status: implemented

## Problem

工作流编辑页右侧的展示结构不统一：事件日志是独立 280px 侧栏（纯 `div` + 左边框），而节点配置卡片（`components/node-setting.tsx`）是另一张悬浮卡片——两者宽度、基础样式、头部（如关闭按钮）都不一致，视觉上「不对齐」。工作流可被多次执行，但没有任何一处记录历史运行，用户无法回放既往某次执行。

## Decision

- **抽出「节点配置卡片」为可复用 `InspectorCard`**：把节点配置的 Card 逐项抽出为 `components/inspector-card.tsx`（borderless + 圆角 12px + 无投影 + 可滚动主体），**样式与节点配置原卡片完全一致**。去掉原 `-4px 0 24px` 强侧向投影——dock 后该投影会在卡片四周/下方形成「蒙版」式灰影；卡片用 borderless 白底圆角在浅灰页面上靠底色区分，不加阴影。
- **节点配置与事件日志复用同一卡片**：`node-setting.tsx`（节点配置）、`event-log.tsx`（事件日志）都用 `InspectorCard`，头部同带关闭按钮（事件日志补上了关闭按钮与 runId 标签）。
- **节点配置不再悬浮**：`node-setting.tsx` 去掉 `XYFlowPanel`，改由页面右侧检查器渲染（`workflow_state_context` 上移到页面统一提供）。
- **事件日志为组合卡**：`replay/event-log-panel.tsx` 是一张更宽的卡（约 600px），内部左右分栏——左边「执行记录」list（约 150px，`run-history.tsx`），右边「事件日志」（450px，`event-log.tsx`）。点击某条执行记录经 `load_replay(run_id)` 拉该次事件历史并切入 replay，从而回放那次执行。
- **展示条件**：右侧检查器为两张卡——【节点配置】与【事件日志组合卡】；节点配置随选中节点出现，事件日志组合卡仅在被执行过（存在 `runs`）时出现；事件日志可关闭（`show_event_log`），切换运行（runId 变化）时自动重开。
- **事件日志展示完整 trace 事件**：`event-log.tsx` 每个条目展示类型 / 节点 / 耗时 / 消息 / 异常详情，并支持展开查看该事件的**输入/输出**快照（`NODE_STARTED` 带 `input`，`NODE_SUCCEEDED` 带 `output` + `duration`）。
- **trace 事件补充输入快照**：`common` 的 `TraceEvent` 新增 `input` 字段；`master` 的 `NodeActionAdapter` 在 `node_started` 事件上携带解析后的节点输入快照（INTERNAL_REF 已读出上游值），`TraceEmitter` 在 Redis 持久化 / SSE / replay 三处序列化该字段。
- **执行历史状态**：`useReplayState` 新增 `runs`；`run()` 成功即头插一条 running，EXECUTION_COMPLETED/FAILED、pause/resume 时同步该条状态；`load_replay` 增加可选 `target_run_id`。

## Alternatives considered

**保留事件日志侧栏（不卡片化）**：改动最小，但与节点配置卡片不同构，达不到「完全一致」；未采纳。

**在事件日志卡片内用分段/标签切换「执行记录 / 事件日志」**：单卡片更省宽，但用户明确要一张独立置最右的执行记录 list card；未采纳。

**节点配置保持悬浮、事件日志单独做一张匹配卡**：两者挂在不同的布局容器上（画布 overlay vs 页面列），无法真正并排同宽「完全一致」；未采纳，改为节点配置同样进入右侧检查器并排。

**为执行历史新增后端 `list-runs` 端点**：能跨会话持久化，但后端无此端点、改动范围扩张到 master；本轮先在前端会话内维护 `runs`，后续再补后端持久化。

## Consequences

- 节点配置、事件日志、执行记录均复用同一 `InspectorCard`（borderless + 圆角 + 无投影 + 可滚动主体，body 用 flex:1 撑满头部以下），视觉与头部一致；事件日志卡为「执行记录 | 事件日志」左右分栏的组合卡。
- 卡片去掉投影（不再有蒙版式灰影）；执行记录展示「记录N + 中文状态 + 时间」，不展示 runId。
- 节点配置由悬浮改为 docked，画布右侧检查器开合时会改变画布宽度；`fitView` 仅在初次挂载触发，检查器打开时画布右缘可能被裁切（后续可在开合时重跑 fitView）。
- 执行记录仅当前会话内有效，刷新后丢失；需要后端 list-runs 端点或前端持久化才能跨会话。
- 事件日志可通过头部关闭按钮隐藏，切换运行或重新运行会自动重开。
