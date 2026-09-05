# Agent Note: 沙箱服务不可达时编码节点失败信息不可读——收敛为可读的 NODE_FAILED

Status: implemented

## Problem

新增的编码（SCRIPT）节点执行发生在独立沙箱服务；沙箱服务未启动（连接被拒）时，节点以 `NODE_FAILED` 失败，但该事件**没有可读信息**：`message` 为空、`errorCode` 为 null、`detail` 为 null、输入/输出快照为空。用户运行编码节点后「没有调试记录，无法看到它的运行状态和输入输出」——节点其实失败了，但前端只看到一个无解释的失败条目。

根因是 JDK `HttpClient` 在连接被拒时抛出 `java.net.ConnectException: null`（message 字面为 null）。`DefaultWorkflowSandboxClient.execute` 只处理「HTTP 往返完成后」的响应（`thenApply(toResponse)`），异步传输失败直接以 failed future 浮出，`ScriptExecutor` 未将其包装为 `WorkflowException`，于是 `NodeActionAdapter` 用 `cause.getMessage()`（= null）取 `NODE_FAILED.message`，透成空字符串。

## Decision

让沙箱传输不可达也收敛为「可读、可归类」的失败信号：

- 后端 [DefaultWorkflowSandboxClient.java](../../../../sandbox/nainu-agi-sandbox-template/src/main/java/nainu/top/agi/sandbox/DefaultWorkflowSandboxClient.java)：`execute` 为 `sendAsync` 链追加 `exceptionally`，把传输失败（连接被拒/超时）转换为 `PLATFORM / SANDBOX_INTERNAL` 的 `SandboxExecuteResponse.failure`，详情含目标地址与根因 message（`rootMessage` 穿透包装、`null` message 回退到异常类名）。上游 `ScriptExecutor.mapResponse` 据此抛出带可读 message 的 `WorkflowException`。
- 后端 [NodeActionAdapter.java](../../../../nainu-agi-master/src/main/java/nainu/top/agi/master/compile/NodeActionAdapter.java)：`NODE_FAILED` 携带输入快照（`input`=解析后的 resolvedInputs），使失败时仍能看到节点消费的输入；`message` 在 cause 无有效 message 时先回退到 `resolveDetail`，再回退到「节点执行失败（类别）」。
- 文档 [master-design.md](../../../../docs/master-design.md) §5.1：把「NODE_STARTED 携带输入快照」扩展为「NODE_STARTED / NODE_FAILED 携带输入快照（失败时仍能看到节点消费的输入）」。
- 测试 [DefaultWorkflowSandboxClientTest.java](../../../../sandbox/nainu-agi-sandbox-template/src/test/java/nainu/top/agi/sandbox/DefaultWorkflowSandboxClientTest.java)：新增「传输不可达收敛为可读 PLATFORM 响应」用例。

## Alternatives considered

**在 `NodeActionAdapter` 对所有执行器统一做 message 兜底、不改客户端**：能兜住「cause 无 message」的一般场景，但连接详情（目标地址、根因类名）在客户端层就丢失，兜底文案无法定位到「沙箱不可达」。未单独采用，作为防御性兜底与客户端修复并存。

**把传输失败以 failed future 继续上抛（保持现状），仅在前端补兜底文案**：把「沙箱为什么失败」的解释推到前端，与后端三件套归类契约相悖，其它消费方拿到的仍是空 message。未采用。

## Consequences

- 沙箱服务未启动/不可达时，编码节点 `NODE_FAILED` 携带可读 message（如「沙箱服务不可达（http://localhost:8090）: ConnectException」）、稳定 errorCode（SANDBOX_INTERNAL）、输入快照；前端事件日志与运行结果卡可据此展示失败原因。
- 事件契约微扩展：`NODE_FAILED` 现在携带 `input` 快照，与 `NODE_STARTED` 一致，便于失败时回放节点输入。
- 依赖沙箱服务确实在运行的「正常路径」不变；本变更只改善「沙箱不可达」这一失败路径的可观测性，不改变编码节点必须依赖沙箱服务才能成功的事实。
