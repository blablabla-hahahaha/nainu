# Agent Note: 为执行错误建立类别契约并按类别透出

Status: implemented

## Problem

执行失败原本只有一个自由文本 `message`：[TraceEvent.java](../../../../nainu-agi-common/src/main/java/nainu/top/agi/common/trace/TraceEvent.java) 只有 `message` 字段，`NODE_FAILED` 与 `EXECUTION_FAILED` 都只携带 `e.getMessage()`；前端 [event-log.tsx](../../../../web/src/components/workflow/replay/event-log.tsx) 用 `EVENT_COLORS[type]` 把所有失败统一染红，[reducer.ts](../../../../web/src/components/workflow/graph/reducer.ts) 把 `event.message` 塞进节点状态。结果无法区分「用户配置或编码错了」还是「平台或上游坏了」。

一个具体事故暴露后果：[DebugExecutor.java](../../../../nainu-agi-master/src/main/java/nainu/top/agi/master/executor/debug/DebugExecutor.java) 把「解析 `jsonTemplate` 失败」用 `catch (Exception e) { log.warn(...) }` 吞掉并返回空对象，节点因此显示成功（`NODE_SUCCEEDED` + `EXECUTION_COMPLETED`），用户预期的「失败 UI」根本不出现。根因不是校验缺失，而是**没有任何一种方式能让执行器声明「这是用户的错，请大声报出来」**。同时它把「模板未配置」与「模板配置了但非法」混成同一路径——前者应合法降级，后者应报错。

## Decision

执行错误按「责任归属」分类，由执行器在抛出时声明三件套（`errorCategory` / `errorCode` / `retryable`），管线与前端按类别路由呈现。分类判据：用户改 DSL 能修好 → `AUTHORING`；不能 → `PLATFORM`（平台自身失败）或 `EXTERNAL`（上游依赖失败）。未知异常默认 `PLATFORM`——未被设计过的错误更可能是平台缺口，不甩锅给用户。

### 类别（ErrorCategory）

| 类别 | 含义 | 用户改 DSL 能修好吗 | 前端呈现 |
| --- | --- | --- | --- |
| `AUTHORING` | 用户配置/脚本/格式错误（坏 JSON、坏脚本、引用悬空、条件表达式非法） | 能 | 红点 + 可行动文案 + 字段定位 |
| `PLATFORM` | 平台自身失败（执行器 bug、Redis/锁、资源上限、不支持的语言） | 不能 | 系统错误 + `errorCode` + `runId`，友好文案，原始堆栈只进日志 |
| `EXTERNAL` | 上游依赖失败（第三方 API 超时/限流/5xx） | 可能重试或改配置 | 上游异常 + 可重试 |

### 严重度与可重试

严重度不设独立枚举：`NODE_FAILED` 即节点/分支失败（ERROR 级），`EXECUTION_FAILED` 即终止执行（FATAL 级）；`retryable` 布尔标记瞬态 vs 永久。WARN（降级继续）通过执行器「返回空/降级结果」而非抛异常表达——如 `DebugExecutor` 未配置模板时返回空对象。

### 契约落点

- `common/exception`：`ErrorCategory` 枚举 + `WorkflowException extends NainuException`（携带三件套，含 `resolveCategory` / `resolveErrorCode` / `resolveRetryable`，沿 cause 链解析、默认 PLATFORM）+ `ErrorCodes` 稳定错误码常量。
- `TraceEvent`：加可选字段 `errorCategory`（`ErrorCategory#name()`）/ `errorCode` / `retryable`，仅失败事件携带；`TraceEmitter` 序列化/回放兼容旧事件。
- `NodeActionAdapter`：`NODE_FAILED` 盖三件套；[WorkflowRunService.java](../../../../nainu-agi-master/src/main/java/nainu/top/agi/master/workflow/WorkflowRunService.java)：`EXECUTION_FAILED` 盖三件套。
- `DebugExecutor`：拆「模板未配置/为空（返回空对象，合法降级）」与「模板非法（抛 `AUTHORING` + `JSON_TEMPLATE_INVALID` / `JSON_TEMPLATE_NOT_OBJECT`）」；`ScriptExecutor`：脚本错误 → `AUTHORING`，不支持的语言 → `PLATFORM`；`DslValidator`：`DSL_INVALID`（`AUTHORING`）；条件路由无命中 → `CONDITION_NO_MATCH`（`AUTHORING`）。
- 前端：`trace_event` / `node_runtime_status` 带 `errorCategory` / `errorCode` / `retryable`；[event-log.tsx](../../../../web/src/components/workflow/replay/event-log.tsx) 优先按类别着色（AUTHORING 红 / PLATFORM 紫 / EXTERNAL 橙）并展示 `errorCode`；[reducer.ts](../../../../web/src/components/workflow/graph/reducer.ts) `NODE_FAILED` 把三件套存入节点状态。

### 透出规则（细节泄漏度）

`AUTHORING` 给原始 `message`（安全且可行动）；`PLATFORM` 只给友好文案（原始堆栈进日志）；`EXTERNAL` 给上游/超时/限流。`errorCategory` / `errorCode` 不直接展示为文本标签（用户不理解内部枚举），仅用于前端着色、重试逻辑与支持关联。失败事件另携带 `detail`（最内层 cause 的关键 message，去类名与 `at [Source...]` 噪音、收敛长度，无底层原因则为空）作为补充信息；前端在同一红色异常框内以「异常详情：」副行展示。

## Alternatives considered

**只做 fail-loud（所有执行器错误都抛，不分类）**：最省事，但把平台 bug 的原始堆栈直接甩给用户，且无法表达「可重试 vs 需改配置」。落选：错误分级是用户可行动性的前提。

**每个错误一个异常子类**：类型最精确，但引入大量类与映射样板，收益不匹配。落选：用枚举承载类别，一个基类够用。

**只在前端按 `message` 关键字猜测类别**：零后端改动，但脆弱、不可靠、不可测。落选：类别是执行器的领域知识，前端无法可靠推断。

**按 DSL 内容哈希做缓存 key（另一种问题）**：与异常分类无关，且之前已评估过。此处不适用。

## Consequences

- 修复：把「指定输出」`jsonTemplate` 写成非法 JSON 的工作流，节点呈失败态（红），事件日志出现 `AUTHORING` + `JSON_TEMPLATE_INVALID` 的 `NODE_FAILED` 与 `EXECUTION_FAILED`，不再静默成功。
- 模板为空仍作空输出成功（合法降级），与「配置了但非法」严格区分。
- 未分类异常默认按 `PLATFORM` 呈现，不向前端暴露原始堆栈。
- 触及 `NodeActionAdapter`（执行核心循环）与 `TraceEvent`（持久化 + 重放）：用可选字段保证旧 Stream 回放兼容；[master-design.md](../../../../docs/master-design.md) 同步更新。
- `DebugExecutor` 语义从「静默降级」改为「大声失败」，符合「配置错误大声失败」。
- `JsonUtils` 反序列化开启 `FAIL_ON_TRAILING_TOKENS`：JSON 值后的多余字符（如 `{}身份`）不再被 Jackson 静默忽略，而是抛 `JsonException` → 归类为 `AUTHORING`，与前端严格 `JSON.parse` 校验一致，封住「看起来该报错却静默成功」的缺口。
- 节点徽标仍对所有失败统一染红，未做节点级并按类别的三色调；节点级按类别三态为后续可选演进。失败节点下方同样渲染可展开的结果卡片：同一红色异常框内，用户可读 `message` 为主行、`detail`（最内层关键信息）为「异常详情：」副行，均垂直排版于输入/输出之前，不展示内部枚举标签。
- 编译期校验（`DslValidator`）错误经 HTTP 错误响应返回，不产生 trace 事件；其类别已在异常层面声明。
