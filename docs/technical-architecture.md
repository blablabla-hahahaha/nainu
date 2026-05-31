# Nainu AGI — Workflow 系统技术架构

## 1. 系统模块总览

系统由 **3 个在役模块 + 2 个挂起骨架** 组成。Master 是执行主体，web 提供编辑与回放，common 承载契约：

```
┌────────────────────────────────────────────────────────────┐
│  web（React 19 · TS · Vite · AntD · React Flow）            │
│  编辑器（注册表驱动画布）+ 回放器（SSE 事件流 → 节点状态）      │
└──────────────┬─────────────────────────────────────────────┘
               │ REST（execute / events / pause / resume）
               │ SSE（stream，Last-Event-ID 续传）
               ▼
┌────────────────────────────────────────────────────────────┐
│  Master（Java 21 · WebFlux · graph-core 1.1.2.2 · Redisson）│
│  DSL 编译（canonical → StateGraph）· 执行（CompiledGraph +   │
│  RedisSaver 检查点）· trace 九事件 · SCRIPT 节点（GraalVM）   │
└──────────────┬─────────────────────────────────────────────┘
               │ Redis（Redisson 统一客户端）
               ▼
┌────────────────────────────────────────────────────────────┐
│  Common：DSL 模型 + workflow-dsl.schema.json（唯一权威）     │
│  + trace 事件模型 + 异常体系 + JSON 工具                     │
└────────────────────────────────────────────────────────────┘

挂起骨架（触发条件见 .agents/notes）：
  gateway —— 多实例/滚动发布需要连接不断时，上 Redis pub/sub 桥接
  worker  —— 阶段二验证侧批量执行时，Redis Streams 队列
```

**模块依赖**：common 被其余模块依赖；gateway / master / worker 之间无编译期依赖。

## 2. 模块职责

### 2.1 web — 编辑器 + 回放器

- 注册表驱动的工作流画布（`create_registry`：type → 组件/设置面板/菜单）
- canonical/view/runtime 三切片状态（受控化重构蓝图：编辑器与回放器共用 reducer）
- 回放器消费 SSE 事件流（九事件 → 节点七态映射），`Last-Event-ID` 断线续传
- DSL 类型由 common 的 schema 生成（`web/src/generated/workflow-dsl.ts`），`npm run gen:dsl` 再生

### 2.2 Master — 执行引擎

- **DSL 编译**：`StateGraphCompiler` 把 canonical DSL 编译为 graph-core `CompiledGraph`（按 workflowId+version 缓存）；节点经 `NodeActionAdapter` 壳接入（输入解析 → 执行 → 输出写回状态）
- **条件路由**：typed conditional edge → 每源节点一个集中式 router（graph-core `addConditionalEdges`）
- **执行**：`threadId = runId`；`RedisSaver` 检查点持久化（暂停/断线可同 threadId 续跑）
- **trace**：九事件（execution_* × 5 + node_* × 4）写入 Redis Stream `trace:{runId}`（XADD ID 即 seq），SSE 实时推送 + XRANGE 历史重放
- **脚本节点**：SCRIPT 类型，GraalVM 嵌入沙箱（无 host 访问、无 IO、语句数上限），`params` 注入 + `main()` 约定
- 暂停/恢复：graph-core 取消语义（at-least-once，被中断节点 resume 后重跑）

### 2.3 Common — 契约层

- DSL 模型（`nainu.top.agi.common.dsl`）：GraphDefinition / NodeDefinition / EdgeDefinition（含条件边）/ 字段定义
- `workflow-dsl.schema.json`：JSON Schema 2020-12 单一权威（结构校验 + TS 类型生成源）
- trace 事件模型（`nainu.top.agi.common.trace`）：TraceEvent / TraceEventType
- 异常体系 + JSON 工具

### 2.4 gateway / worker — 骨架挂起

仅应用入口与配置；触发条件见 [Agent Note](../.agents/notes/implemented/architecture/2026-08-30-workflow-platform-architecture.md)。

## 3. 协议与数据流

| 协议 | 端点 | 用途 |
|---|---|---|
| REST | `POST /api/workflow/execute` | 提交 DSL + 输入，返回 `runId`（异步执行） |
| SSE | `GET /api/workflow/{runId}/stream` | 实时事件流（事件 id = seq，支持 Last-Event-ID 续传） |
| REST | `GET /api/workflow/{runId}/events` | 历史事件（replay） |
| REST | `POST /api/workflow/{runId}/pause` / `resume` | 暂停 / 恢复（HITL 中断注入输入） |
| Redis | `trace:{runId}` Stream / RedisSaver 检查点 / Caffeine 编译缓存 | 事件日志 / 执行状态 / 编译产物 |

执行流：`execute` 编译并启动后台执行 → 节点执行经适配壳发 trace 事件（XADD + 进程内 sink）→ SSE 跟随、events 重放；断线重连从最后 seq 续传。

## 4. 技术栈

| 层 | 技术 |
|---|---|
| Master | Java 21 · Spring Boot 3.5.8 · WebFlux（Reactor）· Spring AI Alibaba Graph 1.1.2.2（graph-core，配 Spring AI 1.1.2）· Redisson 3.45（Redis 统一客户端）· GraalVM polyglot 24.2（脚本沙箱）· Caffeine（编译缓存） |
| Common | Java 21 · Jackson |
| web | React 19 · TS 5.8 · Vite 6 · AntD 6 · React Flow（@xyflow/react）· ajv + json-schema-to-typescript（契约） |
| 存储 | Redis（检查点 / 事件日志 / 锁预留） |

## 5. 与愿景的关系

本架构兑现 [vision.md](vision.md) 的地基：canonical DSL 为智能原子单位（可持久化、可机械验证——`verify-dsl-contract` 门禁）；trace 九事件 + Redis Streams 为一等公民（断点续跑、事件日志、上下文重放）；typed conditional edge 为 schema 窄通道的边语义；SCRIPT 沙箱为治理旋钮雏形。react 节点、workflow 即节点、神经元市场按愿景演化路线逐阶段落地。
