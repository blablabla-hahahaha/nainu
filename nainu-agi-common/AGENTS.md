# AGENTS.md — 后端模块规约（common / gateway / master / worker）

这些规则补充仓库级约定 [../AGENTS.md#conventions](../AGENTS.md#conventions)。

本文件约束所有 AI Agent 在操作后端模块（`nainu-agi-common/`、`nainu-agi-gateway/`、`nainu-agi-master/`、`nainu-agi-worker/`）时必须遵守的工程规则。

## 项目概况

- Gradle 多模块 · Java 21 · Spring Boot 3.5.8 · WebFlux · Spring AI 1.1.2（graph-core 1.1.2.2）
- 模块：`common` | `gateway` | `master` | `worker`
- 依赖方向：`common` ← 其余后端模块；gateway / master / worker 之间**无编译期依赖**，只经 HTTP/RPC 与 Redis 通信

## 架构细节

- 系统总览与通信模式：[docs/technical-architecture.md](../docs/technical-architecture.md)
- Master 设计（DSL / Checkpoint / trace / 沙箱）：[docs/master-design.md](../docs/master-design.md)

## 后端特有规则

- **新节点类型经 `NodeExecutorRegistry` 注册**（`executor/` 下实现类 + 注册），不改编译/执行核心；改核心需同步改 [master-design.md](../docs/master-design.md)。
- **跨实例可变状态必须可重建**：节点输入必须能从执行状态（RedisSaver 检查点 + OverAllState）重建，不做本地内存假设；状态约定见 [master-design.md §4](../docs/master-design.md#4-编译器与执行)。
- **WebFlux 纪律**：全链路响应式（Mono/Flux），禁止在事件循环线程上阻塞（sleep / 同步 IO）；锁的等待与释放必须异步。
- **Worker 插件**：新节点能力注册为插件并消费 Redis Streams；执行完成经 PubSub 回调，不在任务消费线程里阻塞等结果。
- **共享层纪律**：DSL 模型 / 共享 DTO / 异常只放 `common`，服务模块之间不互相 import。
- **配置错误大声失败**：application.yml 缺失引用在启动时校验失败，绝不静默跳过。
- **测试**：JUnit 5 + reactor-test；优先真实实现而非 mock，只 mock 外部服务/时钟等昂贵边界；测试解析到源码平面。
