# AGENTS.md

Nainu AGI — 工作流编排平台：`web/` 前端（React 19 + TS + Vite）、后端 `nainu-agi-*` 四模块（Java 21 + Spring Boot WebFlux + Redis）。改动 `nainu-agi-master/` 前先读 [docs/master-design.md](docs/master-design.md)；文档工作遵循 [docs/AGENTS.md](docs/AGENTS.md)。

## 红线

**AI Agent 在操作任何文件前，必须阅读并遵守路由表中指定的子模块 AGENTS 规约。**

## 路由（按目标路径前缀判断）

| 目标路径前缀                  | 必须阅读并遵守                           |
| ----------------------------- | ---------------------------------------- |
| `web/` 下任何文件             | [web/AGENTS.md](./web/AGENTS.md)         |
| `nainu-agi-common/` 下任何文件 | [nainu-agi-common/AGENTS.md](./nainu-agi-common/AGENTS.md) |
| `nainu-agi-gateway/` 下任何文件 | [nainu-agi-common/AGENTS.md](./nainu-agi-common/AGENTS.md) |
| `nainu-agi-master/` 下任何文件 | [nainu-agi-common/AGENTS.md](./nainu-agi-common/AGENTS.md) |
| `nainu-agi-worker/` 下任何文件 | [nainu-agi-common/AGENTS.md](./nainu-agi-common/AGENTS.md) |
| `docs/` 下任何文件             | [docs/AGENTS.md](./docs/AGENTS.md)       |

## 仓库布局

```
web/                  前端：React 19 · TS 5.8 · Vite 6 · AntD 6 · React Flow
nainu-agi-common/     共享层：DSL 模型 / DTO / 异常体系（被其余后端模块依赖）
nainu-agi-gateway/    网关：骨架（仅应用入口与配置，SSE 桥接为规划项）
nainu-agi-master/     工作流引擎：DSL 编译（graph-core）执行 / RedisSaver 检查点 / trace 九事件 / 脚本沙箱
nainu-agi-worker/     工作节点：骨架（仅应用入口与配置，插件化执行为规划项）
docs/                 架构与设计文档（北极星愿景：[vision.md](docs/vision.md)；规范见 [docs/AGENTS.md](docs/AGENTS.md)）
.agents/notes/        决策记录（Agent Notes）：为什么、放弃了什么
.agents/skills/       可复用工作流技能
scripts/              仓库机械门禁（verify-* + run-gates）
```

## 常用命令

```sh
./gradlew build                # 后端全量构建 + 测试
./gradlew :nainu-agi-master:test   # 单模块测试
cd web && npm install          # 前端依赖
cd web && npm run lint         # 前端 lint（0 error + 0 warning）
cd web && npx tsc -b --noEmit  # 前端类型检查
cd web && npm run build        # 前端构建
npm run verify:all             # 仓库机械门禁全量（根目录）
npm run verify:spec            # 门禁自检（非法用例证明）
```

## 约定（Conventions）

- **依赖方向**：`common` ← gateway / master / worker；三个服务模块之间无编译期依赖（[build.gradle](build.gradle)）。
- **注册即副作用**：一切贡献经受管理的注册机制（Spring 容器、`NodeExecutorRegistry`、Worker 插件）；注册函数返回可释放句柄（[docs/master-design.md](docs/master-design.md)）。
- **新行为挂扩展点，不改核心循环**：新节点类型经 `NodeExecutorRegistry` 注册；改编译/执行核心（`StateGraphCompiler` / `WorkflowRunService`）需同步改 [docs/master-design.md](docs/master-design.md)。
- **跨实例可变状态必须可重建**：影响执行结果的输入（节点输入）必须能从执行状态（RedisSaver 检查点 + OverAllState）重建，不做本地内存假设（[docs/master-design.md](docs/master-design.md#4-编译器与执行)）。
- **配置错误大声失败**：Spring 配置在加载时校验；绝不静默跳过缺失引用。
- **测试描述行为，不是正确性**：改过时行为连同其测试一起改（[docs/AGENTS.md](docs/AGENTS.md)）。
- **非平凡变更必须同 PR 附 Agent Note**（[范围与何时写](.agents/notes/README.md#何时需要写一份)）。
- **TODO 标记分级**：`FIXME`（发版阻塞）> `TODO`（尽快）> `XXX`（可能永远不）——门禁 [verify-todo-grade](scripts/verify-todo-grade.ts)。
- **一段一行**：Markdown 段落软换行——门禁 [verify-md-wrap](scripts/verify-md-wrap.ts)。
- **相对链接不死链**：仓库引用用相对 Markdown 路径——门禁 [verify-md-links](scripts/verify-md-links.ts)。
- **词数预算**：常驻文档超限即失败（[scripts/doc-budgets.manifest.json](scripts/doc-budgets.manifest.json)）。
- **文件以恰好一个换行结尾、无行尾空白**——门禁 [verify-file-hygiene](scripts/verify-file-hygiene.ts)。
- **只写现状**：持久文档不写变更历史（"previously/now/no longer/PR"）——[slop 清单](docs/AGENTS.md#slop-清单)。

## 防御性模式

做生命周期、并发、分布式锁、子进程或 teardown 工作前，先读 [docs/defensive-patterns.md](docs/defensive-patterns.md)。

## 类型安全与文档

后端在 Java 21 下编译，前端在 TS `strict` 下编译；每个残留的逃逸类型（`any`）解释为何无法收窄。评论与文档陈述**完整契约，而非推理过程**。把「值得机械检查的不变量」接入 [scripts/run-gates.ts](scripts/run-gates.ts) 门禁，并证明每条改动的接受路径都拒绝一个非法用例（[scripts/spec/](scripts/spec/)）。

## 编辑这些指令

本文件是仓库唯一的智能体指令入口。每条规则自足，同时链接高层文档；细节一律下沉到 docs / Agent Notes，不在本文件复述。
