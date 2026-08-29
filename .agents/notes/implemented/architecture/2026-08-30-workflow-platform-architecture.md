# Agent Note: Workflow 平台技术架构（graph-core 集成 + 契约优先）

Status: implemented

## Problem

现有实现无法承载 [vision.md](../../../../docs/vision.md) 的愿景约束：workflow 图为智能的原子单位（可持久化、可版本化、可机械验证），trace 是一等公民（断点续跑、事件日志、上下文重放），schema 窄通道（typed edge、字段级引用），react 节点受控自主，治理旋钮（沙箱），作者侧编排机器人（DSL 机器可生成）。现状是：master 自研 DAG 引擎（WorkflowExecutor + Redis 上下文 + 锁）只覆盖基础调度；前端与后端无共享契约，双图表示实存（前端 `workflow_graph` 的 `data` 黑盒 vs 后端 `config/input/output`，条件路由表示分裂：前端 typed edge vs 后端 `config.branches`）；无 trace 事件流；无脚本沙箱；gateway/worker 为空壳。需要一次契约优先的架构重构。

## Decision

[spring-ai-alibaba-graph-core 1.1.2.2](https://github.com/alibaba/spring-ai-alibaba/tree/main/spring-ai-alibaba-graph-core) 作为执行后端（版本对齐实现时定稿：Spring AI 1.1.2 + Boot 3.5.8），调度/条件边/检查点/流式/HITL 由框架承担；自建部分为 DSL 契约与 schema 窄通道语义、trace 九事件层、`NodeActionAdapter` 壳、条件 router、SCRIPT 沙箱。拓扑为 web + master + common 三件套在役，gateway/worker 骨架挂起（触发条件：gateway = 多实例/滚动发布需要连接不断时上 Redis pub/sub 桥接；worker = 阶段二验证侧批量时用 Redis Streams 队列）；阶段一 SSE 直连 + `Last-Event-ID` 续传替代 gateway 职责。

DSL 以 `nainu-agi-common/src/main/resources/dsl/workflow-dsl.schema.json`（JSON Schema 2020-12）为单一权威：Java 模型（`nainu.top.agi.common.dsl`）与前端 TS 类型（`web/src/generated/workflow-dsl.ts`，`json-schema-to-typescript` 生成、提交入库）都以它为准；前端运行时校验用 ajv。条件路由 canonical 化为 typed conditional edge（`edge.condition`，branchType IF/ELIF/ELSE），graph-core 的集中式 router 模型差异由编译器吸收（按边数组序求值，key=边 id，`Map<edgeId, target>` 路由）。图级规则（START 唯一、DAG、引用可解析、条件边合法性）由 `DslValidator`（Java）与 `scripts/dsl-graph-rules.ts`（Node）各自实现、共享同一组非法用例。`verify-dsl-contract` 门禁（生成新鲜度 + 样例结构/图级校验 + 非法用例双拒）接入 run-gates。

trace 九事件（execution_* × 5 + node_* × 4）持久化于 Redis Stream `trace:{runId}`（XADD 自动 ID 即 seq），实时经进程内 sink 推 SSE、历史经 XRANGE 重放；`threadId = runId`，RedisSaver 检查点支持暂停（graph-core 取消语义，at-least-once）与同 threadId 续跑；HITL 中断（`InterruptionMetadata`）检测与 `updateState` 恢复已就绪。master 的 Redis 访问统一到 Redisson（Lettuce 退役，后端整体重写无历史负债）。SCRIPT 节点用 GraalVM 嵌入沙箱（`HostAccess.NONE` + `allowIO(false)` + `ResourceLimits.statementLimit`），`params` 注入 + `main()` 约定，先 JS 后 Python（GraalPython 无法运行 C 扩展依赖）。

前端受控化重构（canonical/view/runtime 三切片、统一节点目录、回放器）已交付，见 [前端受控化重构与回放器（implemented）](./2026-08-30-frontend-controlled-refactor.md)。

## Alternatives considered

**自研引擎不引入 graph-core**：深挖前倾向自研，但 graph-core 覆盖最难的可靠性部分（Redis 检查点、流式、HITL、子图、ReactAgent），自研成本与可靠性风险是主要关切；深挖（含 [RedisSaver 检查点示例](https://github.com/alibaba/spring-ai-alibaba/blob/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/graph/examples/CheckpointRedisExample.java)）证明框架成熟度足够，落选。
**引入 spring-ai-alibaba-admin / studio 产品**：有完整工作流 DSL + 编辑器 + GraalVM 脚本节点，但其 DSL 执行引擎也是自研（jgrapht + processors，未用 graph-core），且是重产品（用户/API key/MCP/知识库等）；graph-core 的 `GraphRepresentation` 只有 Mermaid/PlantUML 单向导出，无 DSL 往返能力——编辑器 DSL 无论如何要自建。落选。
**langgraph4j**：社区维护、版本波动，state 模型同样无 schema 窄通道语义。落选。
**条件路由保持 `node.config.branches`**：前端已按 typed edge 实现分支，graph-core `addConditionalEdges` 直接对应，愿景要求 typed edge；node-level branches 造成前后端模型分裂持续。落选。
**gateway 阶段一独立部署**：graph-core / admin 均不提供 Redis 消息化桥接（admin 直连 `SseEmitter`），检查点 + SSE 续传已覆盖阶段一「连接可以断、体验不断」；多实例前不建。落选。
**Redis 双客户端（Lettuce + Redisson 并存）**：后端可整体重写、历史负债不考虑，双客户端是纯成本；统一 Redisson。落选。
**事件日志用 LIST + INCR 计数器**：Redis Streams 的自动单调 ID（即 seq）、区间查询、阻塞读更贴合 replay / live / 续传三需求。落选。
**前端校验零依赖（后端兜底）**：ajv 让 per-type config 错误在保存前尽早失败，正确性前移，符合机械门禁文化。采用。
**GraalVM 24.1/24.2 仅提供 statementLimit**（timeLimit/maxHeapMemory 在更新版本）：以语句数上限为防死循环主守卫，timeLimit/maxHeapMemory 待升级补齐。采用。

## Consequences

- 版本锁定：SAA BOM 1.1.2.2（Spring AI 1.1.2 / Boot 3.5.8）；graph-core 版本迭代快，编译器与自建层隔离在框架 API 之后，升级只动适配层。
- at-least-once 执行语义：取消/恢复会重跑被中断节点，节点执行器（尤其 SCRIPT）保持幂等/无副作用。
- 事件日志与检查点分离：`trace:*` 流管事件、RedisSaver 管执行状态，各司其职。
- 单实例阶段一：RunSession 与 SSE sink 在进程内，多实例暂停/续跑需 Redis 协调（挂起项，与 gateway 同批）。
- 事件模型与前端七态映射就绪，前端回放器（proposed note）所需 API（execute/stream/events/pause/resume）已全部提供。
- 文档与代码同步：`docs/technical-architecture.md` / `docs/master-design.md` 已更新为现状；改动核心循环需同步这两份文档。
