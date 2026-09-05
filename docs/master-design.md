# Nainu AGI Master 模块设计文档

## 1. 模块定位

Master 是 Workflow 系统的执行引擎：DSL 编译（canonical DSL → graph-core StateGraph）、执行（CompiledGraph + RedisSaver 检查点）、trace 事件（九事件 → Redis Streams）；编码（SCRIPT）节点的执行经独立沙箱服务（HTTP 远程）完成，见 [standalone sandbox service](../.agents/notes/proposed/architecture/2026-09-02-standalone-code-sandbox-service.md)。执行后端为 [Spring AI Alibaba Graph](https://github.com/alibaba/spring-ai-alibaba)（graph-core 1.1.2.2）；DSL 是自持资产，框架差异由编译器吸收。

## 2. DSL 契约

### 2.1 单一权威

`nainu-agi-common/src/main/resources/dsl/workflow-dsl.schema.json`（JSON Schema 2020-12）是唯一权威：Java 模型（`nainu.top.agi.common.dsl`）与前端 TS 类型（`web/src/generated/workflow-dsl.ts`，`npm run gen:dsl` 生成）都以它为准；`verify-dsl-contract` 门禁保证生成新鲜度、样例结构合法、非法用例前后端双拒。

### 2.2 DSL 结构

```jsonc
{
  "id": "workflow-demo-branches",
  "name": "条件分支测试工作流",
  "version": 3,                     // 乐观锁：保存时 +1（编译缓存 key）
  "meta": { "view": { } },          // 视图状态（位置/视口）约定放 meta.view
  "nodes": [{ "id": "start", "type": "START", "config": {}, "input": [], "output": [] }],
  "edges": [{ "id": "e1", "source": "start", "target": "debug_start",
              "sourceHandle": "branch-1",     // 多出向连接点标识
              "condition": { "branchType": "IF", "logicOperator": "AND",
                             "conditions": [{ "field": { "key": "username", "type": "INTERNAL_REF", "value": "debug_start:username" },
                                              "operator": "EQUALS", "value": "张三0" }] } }]
}
```

### 2.3 节点类型

| 类型 | 执行位置 | 说明 |
|------|----------|------|
| START / END | graph-core 虚拟节点 | 编译器映射到 `StateGraph.START/END` |
| CONDITION | 纯路由点（NoopExecutor） | 出边为条件边，router 求值路由 |
| DEBUG | Master 内部 | 固定演示数据 |
| SCRIPT | 沙箱服务（远程 HTTP） | 脚本 + `params` 发给沙箱服务执行，`main()` 约定（见 §6） |

### 2.4 字段引用

`INTERNAL_REF`（格式 `nodeId:key`，解析为状态键 `node:{nodeId}.{key}`）、`CUSTOM`（字面量）、`EXTERNAL_REF`（预留，求值为 null）。

### 2.5 条件路由（typed conditional edge）

条件路由以边承载：`edge.condition`（branchType IF/ELIF/ELSE + 逻辑表达式）。规则（图级校验器强制，前后端双拒）：CONDITION 出边必须全部为条件边；至多一条 ELSE 且为数组最后一条；ELSE 无表达式；IF/ELIF 必须有表达式；条件边引用与节点 input 同规则（格式、上游、输出存在）。

## 3. 图级校验器

| 实现 | 位置 | 职责 |
|------|------|------|
| `DslValidator`（Java） | `compile/` | 编译前校验，失败抛 `WorkflowException`（`AUTHORING`，大声失败） |
| `scripts/dsl-graph-rules.ts`（Node） | 仓库脚本 | `verify-dsl-contract` 门禁 + 前端预检参考 |

共享同一规则清单与用例集（`scripts/spec/dsl-contract.spec.ts` + `DslValidatorTest`）。

## 4. 编译器与执行

### 4.1 StateGraphCompiler

`compile(GraphDefinition)` → 校验 → 构建 `StateGraph` → `compile(CompileConfig)` 带 RedisSaver；按 `(workflowId, version)` 缓存（Caffeine）。节点映射：START/END → 虚拟节点；其余 → `NodeActionAdapter` 包装注册的执行器（`NodeExecutorRegistry`，注册即副作用）。条件边：每源节点一个集中式 router——按 DSL 边数组序求值 `edge.condition`，命中返回边 id，`Map<edgeId, target>` 路由。

### 4.2 NodeActionAdapter

统一壳（`compile/`）：trace `node_started`（含节点输入快照——解析后的值）→ 输入解析（INTERNAL_REF 读状态）→ 经执行器异步变体（`executeAsync`）执行 delegate，IO 型节点（HTTP / LLM / SCRIPT）覆盖该变体以非阻塞方式调用，不阻塞事件循环线程 → trace `node_succeeded/failed`（含按 `node.output` 别名映射后的输出快照与耗时）→ 输出写回状态（`node:{nodeId}.{keyAlias}`，KeyStrategy Replace）。`node_failed` 事件把抛出异常的 `errorCategory / errorCode / retryable` 三件套盖到事件上；非 `WorkflowException` 异常默认按 `PLATFORM` 归类（未知异常不甩锅给用户）。

### 4.3 状态 key 约定（workflow/StateKeys）

`node:{nodeId}.{keyAlias}`；`nodeId:key` 引用解析为同一键。

## 5. trace 与检查点

### 5.1 九事件

`EXECUTION_STARTED / COMPLETED / FAILED / PAUSED / RESUMED` + `NODE_STARTED / SUCCEEDED / FAILED / SUSPENDED`。事件持久化于 Redis Stream `trace:{runId}`（XADD 自动 ID 即 seq，单调），实时经进程内 sink 推送（SSE），历史经 XRANGE 重放。node 级事件由适配壳发射；`NODE_SUSPENDED` 由运行服务检测流中的 `InterruptionMetadata` 发射；`EXECUTION_*` 由运行服务发射。`NODE_STARTED`/`NODE_FAILED` 携带节点输入快照（失败时仍能看到节点消费的输入），`NODE_SUCCEEDED` 携带输出快照与耗时，供前端按事件回放输入/输出。SSE 线格式为默认 message 事件（帧仅 `id` + `data`，类型在 `data.type` 内），`EventSource.onmessage` 即收——服务端不发送命名 `event:` 帧，避免与浏览器默认事件语义不一致。失败事件（`NODE_FAILED` / `EXECUTION_FAILED`）附带可选 `errorCategory / errorCode / retryable`，供前端按类别路由呈现；旧事件缺省该字段仍可回放。

### 5.2 执行错误类别

执行错误按「用户改 DSL 能否修好」划分责任归属（`common/exception`）：`AUTHORING`（用户配置/脚本/格式错误，前端可行动地透出）、`PLATFORM`（平台自身失败，只给友好文案；errorCode/runId 仅作支撑标识，不直接展示给用户）、`EXTERNAL`（上游依赖失败，可重试）。分类判据与默认值见 `WorkflowException`。执行器在抛异常时声明三件套，前端用于着色与重试逻辑，不回显内部枚举标签。失败事件另携带 `detail`（最内层 cause 的关键 message，去除类名与 `at [Source...]` 位置噪音并收敛长度，无底层原因则为空），作为用户可读文案之外的补充信息，供深挖与 AI 上下文使用。

### 5.3 执行会话

`WorkflowRunService` + `RunSessionRegistry`（进程内 Map<runId, session>）。`threadId = runId`；暂停 = 取消流订阅（graph-core 取消语义，**at-least-once**：被中断节点 resume 后重跑，节点执行器须幂等）；恢复 = 同 threadId 再 invoke（RedisSaver 从最后检查点续跑）；HITL 恢复先 `updateState(config, input, interruptedNode)`。

### 5.4 Redis

Redisson 统一客户端（Lettuce 已退役）。RedisSaver 检查点 + `trace:*` 事件流共用；Caffeine 仅编译缓存。

## 6. 编码节点（SCRIPT）

`ScriptExecutor`（`executor/script/`）：master 侧的远程 HTTP 客户端（执行发生在独立沙箱服务，见 [standalone sandbox service](../.agents/notes/proposed/architecture/2026-09-02-standalone-code-sandbox-service.md)）。契约：把 `config.language` + `config.script` + 已解析输入（`params`）打包为 `SandboxExecuteRequest` 经 `WorkflowSandboxClient` 发给沙箱服务；脚本必须定义 `main()`，返回对象按 output 映射写回状态。沙箱服务按所选策略执行：默认 `-local`（本地全新子解释器，clone 即跑、隔离最弱、仅开发）；`-kubernetes`（K8s Pod，强隔离 + 动态扩缩容 + 插件化）。master 前置一层 Python 静态黑名单校验（禁 `subprocess` / 文件写 / `eval` 等）。失败分类：脚本语法/运行时/静态校验错误 → `AUTHORING`；不支持的语言/超时/沙箱服务问题 → `PLATFORM`；均经 `node_failed` 透出。脚本应无副作用或幂等（at-least-once 语义下节点可能重跑）。

## 7. API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/workflow/execute` | 提交 DSL + inputParams，返回 `runId`（异步执行） |
| GET | `/api/workflow/{runId}/stream` | SSE 事件流（`Last-Event-ID` 续传） |
| GET | `/api/workflow/{runId}/events` | 历史事件（replay） |
| POST | `/api/workflow/{runId}/pause` | 用户暂停 |
| POST | `/api/workflow/{runId}/resume` | 恢复（body 可携带 HITL 输入） |

## 8. 目录结构

```
nainu-agi-master/src/main/java/nainu/top/agi/master/
├── MasterApplication.java
├── WorkflowCommandLineRunner.java      # 启动加载 workflow-demo.json 演示
├── compile/                           # DslValidator / StateGraphCompiler / NodeActionAdapter
├── controller/                        # WorkflowController + request/response
├── executor/                          # NodeExecutor 契约 + Registry + start/end/debug/condition(Noop)/script
├── trace/                             # TraceEmitter（XADD + sink + XRANGE）
└── workflow/                          # WorkflowRunService / RunSession / RunSessionRegistry / StateKeys
```
