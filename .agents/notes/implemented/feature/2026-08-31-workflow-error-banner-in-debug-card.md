# Agent Note: workflow 级执行错误改为调试结果卡片顶部红色提示条

Status: implemented

## Problem

执行启动即失败（如 DSL 校验错误，`execute_workflow` 抛「执行失败（HTTP 500）」）时，错误信息以危险色文本显示在顶部运行/回放控制按钮组里（`ReplayControls`），位置突兀、且与「调试记录（执行记录 + 事件日志）」卡片分离。即使没有成功发起执行（无 runId），报错也应记录在调试结果卡里。

## Decision

- [workflow.ts](../../../../web/src/services/workflow.ts)：`execute_workflow` 在非 2xx 时解析响应体（`ExecuteWorkflowResponse.error` 的 `message`），把后端真实原因拼进报错（如「执行失败（HTTP 500）：DSL 校验失败：…」），而非只透出 HTTP 状态。
- [replay-controls.tsx](../../../../web/src/components/workflow/replay/replay-controls.tsx)：移除控制条上的错误文本；「调试记录」按钮在存在错误但尚无 run（`!has_runs && error_message`）时也启用，便于打开去查看错误。
- [event-log-panel.tsx](../../../../web/src/components/workflow/replay/event-log-panel.tsx)：新增 `error_message` prop，在「执行记录 / 事件日志」上方渲染一条红色提示条（复用主题 `colorError*` 令牌）。
- [workflow-page.tsx](../../../../web/src/pages/workflow/workflow-page.tsx)：`show_log` 与「调试记录」可用性纳入 `has_error`；`execution_status === 'error'` 时自动打开调试结果卡，把 `error_message` 传入面板。

`useReplayState.run()` 在每次执行开始时 `setErrorMessage(undefined)`，故成功重跑后错误提示条自动隐藏。

## Alternatives considered

**错误同时保留在控制条和卡片两处**：冗余且顶栏依旧突兀。仅保留卡片一处。未采用。

**前端内置 DSL 前端校验，运行前拦截**：超出本次范围；后端大声失败已是契约，前端只需把原因透出到调试卡即可。未采用。

## Consequences

- workflow 级错误集中展示在调试结果卡顶部，与执行记录/事件日志同处一地；卡片在「未发起成功执行」时也能打开并展示错误。
- 成功重跑后提示条随 `error_message` 清空而隐藏。
- `execute_workflow` 报错信息更完整（含后端 message），便于用户定位（如 DSL 校验错误）。
