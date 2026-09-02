# Agent Note: 独立沙箱服务——编码节点解耦为基于 K8s 的动态扩缩容隔离执行

Status: proposed

## Problem

Master 当前内置一个进程内 GraalVM SCRIPT 沙箱（[master-design.md §6](../../../../docs/master-design.md)，`executor/script/ScriptExecutor`），在调度实例里同步执行用户 JS。这带来结构性缺陷。

**责任错位**：master 的定位是调度——[vision.md](../../../../docs/vision.md) 里 workflow 图为智能原子单位、trace 为一等公民、schema 窄通道为保真机制——却同时承担具体节点的代码执行纵深，违反高内聚低耦合、职责不清晰。master 应只做图调度与状态。

**语言受限**：仅 JS；GraalPython 无法运行 C 扩展依赖（numpy/pandas 等），覆盖不了真实 python 脚本，而目标是「编码节点接受 python 代码」。

**并发与隔离不足**：在一实例内为每执行起脚本上下文/进程，扛不起「100 个工作流 × 每工作流 10 个脚本」这类突发并发，且无 OS 级隔离。

**无独立治理**：审计 / 配额 / OS 沙箱（vision 阶段四运行时治理）与验证侧批量执行（阶段二）无处安放。

**无扩缩容与插件化空间**：脚本负载是突发性的，需要一个能按需横向扩缩容的执行层；且这个执行层不应只服务「跑一段 script」，而应能长成「用户自配镜像、自装运行环境的插件服务」——后者正是 [vision.md](../../../../docs/vision.md) 里神经元市场 / react 节点自主的方向，需要更强的执行底座。

## Proposal

把「跑脚本」从 master 彻底解耦，新增一个可执行的沙箱服务 `nainu-agi-sandbox-starter`（运行 `SandboxService` 的控制面，默认装配 `-local`、可换 `-kubernetes` 策略），作为唯一负责无状态代码执行的组件；它按所选策略调度隔离的沙箱（集群时为 sandbox Pod），并据此实现**动态扩缩容**与**可扩展的沙箱镜像/插件服务**。master 的编码节点执行器退化为远程 HTTP 客户端。整个沙箱按「契约独立成模块、实现按需引入」分包，见「模块拆分与依赖」。

### 职责边界与拓扑

sandbox 控制面只做「run code → return result」与沙箱生命周期管理，master 只做调度与状态，二者经 HTTP 单向通信，**不共享实例**（高内聚低耦合）。用户代码不落 master 内存假设，符合「跨实例可变状态必须可重建」。

```
web ──(REST/SSE)──> master(纯调度) ──(HTTP execute)──> nainu-agi-sandbox-starter(可执行沙箱控制面)
                                                               │
                                                               ▼
                                                        策略: local(主机本地执行) / kubernetes(K8s 集群 Pod)
```

集群可自托管（k3s / kind，保持无厂商依赖）或托管集群（EKS / GKE / ACK），属于部署选择；`-starter` 采用 `kubernetes` 策略时才依赖集群。

### SandboxStrategy 隔离缝与模块拆分（Spring Boot 风格分包）

沙箱按 Spring Boot 风格分包：父目录 `sandbox/` 聚合，契约独立成模块、实现按需引入；`SandboxStrategy` SPI 放在给 workflow 用的契约模块，实现是给 `-starter` 条件装配的策略包。

| 模块 | 职责 | 自带重依赖 | 谁引用 |
|---|---|---|---|
| `sandbox/nainu-agi-sandbox-template` | 给 workflow 用的 SPI SDK：execute 请求/响应 DTO + `WorkflowSandboxClient` 门面 + `SandboxStrategy` SPI + `SandboxInfo` | 无（仅 common + Jackson） | master（客户端）+ 服务 + 各策略 |
| `sandbox/nainu-agi-sandbox-starter` | 可执行沙箱服务（bootJar + `@SpringBootApplication`）：`SandboxService` 装配（会话绑定 / 生命周期 / execute API）+ 默认装配 `-local`、可换 `-kubernetes` 策略；可直接启动 | 取决于装配的（默认 `-local`） | 部署/运行 |
| `sandbox/nainu-agi-sandbox-local` | 策略：在主机本地执行（实现 SPI + `@AutoConfiguration` + `@ConditionalOnMissingBean`） | 尽可能无（不引 docker-java / K8s client） | 可选引入 |
| `sandbox/nainu-agi-sandbox-kubernetes` | 策略：在 K8s 集群执行（实现 SPI + `@AutoConfiguration` + `@ConditionalOnMissingBean`） | Kubernetes 客户端（fabric8 / io.kubernetes） | 可选引入 |

- **`-template` 保持最轻**：master 只依赖它（execute DTO + 客户端门面），所以 master 不因引入沙箱而背上 Docker / K8s 依赖；它也是服务端 `SandboxStrategy` SPI 的所在地。
- **`-starter` = 可执行沙箱服务**：持有一个 `@SpringBootApplication` 主类 + `SandboxService`（需要恰好一个 `SandboxStrategy` bean）；**默认装配 `nainu-agi-sandbox-local`，可直接启动**（clone 即跑、零集群）。默认因 `-starter` 的构建依赖指向 `-local`。
- **策略 = 选配的依赖/可切换**：`-local` / `-kubernetes` 各是一段 `@AutoConfiguration`，用 `@ConditionalOnMissingBean(SandboxStrategy)`（可加 `@ConditionalOnClass` / `@ConditionalOnProperty(sandbox.type)`）注册自己的 `SandboxStrategy` bean，经 `META-INF/spring/...AutoConfiguration.imports` 注册。**把 `-starter` 的策略依赖从 `-local` 换成 `-kubernetes`（如经构建属性 `-Psandbox.strategy=kubernetes`），即变集群策略**；换策略才把 K8s 客户端等重依赖带进来，满足「避免依赖过重、让开发者选配」。选 `-local` → 零集群、clone 即跑；选 `-kubernetes` → 连集群、得扩缩容 / 插件化。
- **边界守则**：两个策略都在场 → 用 `sandbox.type` 显式选或大声失败（不静默取默认）；一个都不在场 → 启动大声失败（无 `SandboxStrategy` bean），符合「配置错误大声失败」红线。

### 动态扩缩容（核心能力）

横向扩容由 K8s 承担：沙箱以**可复用 Pod 池**运行（Deployment），按负载**自动扩缩容**（HPA 按 CPU/会话数、或自定义指标/KEDA 按队列深度），空闲时按 TTL 缩容到低位甚至零。突发（100 工作流 × 10 脚本）时池自动加 Pod 吸收，回落后自动回收——避免固定进程数的天花板，也避免常驻上百容器。

### 每工作流绑定与可重连元数据

`WorkflowCodeSandbox` 协议（`executeCommand / readFile / writeFile`）。`SandboxSessionStore` 按 `workflow_id`（或 session）绑定一个沙箱（namespace / Pod label / service URL），`SandboxInfo` 持久化；因为沙箱是 **K8s 集群里的真实对象**，集群 API 即共享真源——跨进程 / 跨 Pod 重连天然可靠（符合「可重建」）。随该工作流的多个编码节点复用一个 Pod。

### 执行清洁与隔离

- **隔离**：Pod 级——network policy（仅 egress）、非 root、只读根文件系统、Seccomp 配置、资源 requests/limits（CPU / 内存 / 超时）。
- **清洁**：Pod 常驻复用时，**每次执行在 Pod 内起一个全新 Python 子解释器**跑这段代码（无跨执行残留），跑完回收。

### 安全策略：允许简单 HTTP/JSON、禁止危险操作

受限基础镜像 + Pod 安全上下文（非 root、只读根文件系统、`cap-drop` + `no-new-privileges` + Seccomp）锁进镜像；网络策略允许 egress（简单 HTTP）但禁止落地 / 内网探测；master 侧前置一层 Python 静态校验 / 白名单（禁 `subprocess`、`os` 写等），双保险。

### 可扩展的沙箱镜像 / 插件服务（为未来铺路）

沙箱 Pod 运行**用户可配置、可安装的镜像**。控制面提供「沙箱镜像目录 + 预载 + 白名单」：用户新增 / 安装一个沙箱镜像，编码节点即可运行它。这使该执行层不止服务「跑一段 script」，而是成为**通用插件底座**——用户自配运行环境（如带特定依赖的镜像、特定工具链的容器），符合 vision 里 react / 神经元市场的信任与可扩展方向。

### API 契约与错误分类

`POST /sandbox/execute {language:python, image?, code, params, limits}` → `{result, stdout, stderr, errorCategory, errorCode, detail, duration}`。错误分类沿用现有三件套（[execution-error-category-contract](../../implemented/architecture/2026-08-30-execution-error-category-contract.md)）：用户脚本语法 / 运行时错误 → `AUTHORING`；资源上限 / 集群或服务问题 → `PLATFORM`。

### 与 master 的接入

编码节点类型经 `NodeExecutorRegistry` 注册，作为 `NodeExecutor` 实现；`NodeActionAdapter` 需支持异步 action 变体（现仅 `executeSync`，见其注释「IO 型节点（HTTP / LLM / SCRIPT）在实现时经异步 action 变体接入」），使 sandbox HTTP 调用不阻塞事件循环线程。master 仅依赖 `nainu-agi-sandbox-template`（execute DTO + 客户端门面），不引入任何策略实现的重依赖。

### 不引 spring-ai-alibaba-sandbox

该 artifact 是 AgentScope 沙箱的 Spring AI `ToolCallback` 包装，专供 `ReactAgent` + `ChatModel`（agent-tool 形态）；底层依赖 docker-java / agentbay / aliyun-oss；无 JS 工具。与本节点「无 LLM、纯跑脚本、Python、可扩缩容插件化」错位。故不引入，改自建 K8s 控制面（备选详述）。

## Alternatives considered

**自托管本地 Docker 容器策略**：轻、无集群；但无动态扩缩容（受单机 Docker 上限）、无插件镜像生态、扩展性差，且若与 master 同实例则又回到职责错位。仅保留为开发/调试 fallback。落选。

**进程内一体（扩 SCRIPT → GraalVM JS + GraalPy）**：改动最小；但执行塞进 master（责任错位）、每执行上下文/进程扛不起突发并发、无 OS 隔离、GraalPy 跑不了 C 扩展、无扩缩容。落选。

**采用 spring-ai-alibaba-sandbox（AgentScope）**：能跑 Python/shell 于 Docker 隔离，且有 K8s/ACK 后端；但其形态是给 ReactAgent 的 `ToolCallback`（需 ChatModel，我们无 LLM），`BaseSandbox` 按 (user, session) 起容器、靠堆容器扩容，底层拉 docker-java + agentbay + aliyun-oss；无原生 JS 工具；README 明言非通用远程沙箱客户端、生产需自加策略 / 清理。形状与可控性错位。落选。

**参照 agentic-workflow-studio**：借鉴其「每工作流绑定一个常驻沙箱（`WorkflowSandboxSessionStore` + `AioSandbox`）、`WorkflowCodeSandbox` 协议直接跑码不绕 agent、`SandboxInfo` 跨进程可重连、`SandboxStrategy` 可插拔、K8s 沙箱池（create/list/get/delete + 状态 Pending/Running/Succeeded/Failed/Unknown）、沙箱镜像 store / 预载 / python 探测、TTL 清理、审计」。将其 K8s 池 + 镜像目录 + 治理项落为自建的 `KubernetesSandboxStrategy` 控制面，并强化动态扩缩容与插件镜像扩展。

**Pod 一次一执行（K8s Job）**：每执行一个 Job，隔离最强、天然 scale-out；但每个脚本冷启动（镜像拉取 / Pod 起停）开销大、无复用，适合独立 / 批处理场景。编码节点默认用它不划算，仅作为阶段二「验证侧批量执行」的备选形态。

**LocalDockerStrategy 与 workflow 同实例**：共享实例、职责模糊、无生产级场景，违反高内聚低耦合。否决——这也是「独立部署、不共享实例」的由来。

## Acceptance criteria

完成即可观察为：启动可执行沙箱服务 `nainu-agi-sandbox-starter` 后，master 提供编码节点（`SCRIPT` 扩多语言或新增 `CODE`），工作流能端到端运行——节点把 python 脚本 + 参数发给沙箱服务，沙箱在所选策略下执行并返回结果写回状态、以九事件透出。

- 沙箱控制面独立部署，master 仅经 HTTP 调用，无本地内存假设；集群 Pod 重启后能靠 `SandboxInfo` 重连同一绑定沙箱。
- **分包可观察**：master 仅依赖 `nainu-agi-sandbox-template`；选 `local` 时零集群依赖、clone 即跑；选 `kubernetes` 时连集群、得扩缩容 / 插件化；未引入的策略其重依赖不出现。
- **动态扩缩容可观察**：高并发（池低水位）下 Pod 自动横向扩容；负载回落后按 TTL / 策略缩容回收。
- 每次执行在 Pod 内起全新 Python 子解释器：连续两次执行不共享变量残留（`a=1` 后第二次读不到 `a`）。
- 允许的脚本（含简单 HTTP / JSON 协议转换）返回正确结果；危险操作（`subprocess` / 写文件 / 内网探测）被拦截或失败。
- 错误分类：用户脚本语法 / 运行时错误 → `AUTHORING`；资源上限 / 集群问题 → `PLATFORM`，均经 `node_failed` 带三件套透出。
- **插件化可观察**：用户新增 / 安装一个沙箱镜像后，编码节点可运行它（镜像目录 + 预载 + 白名单生效）。
- Pod 隔离（network policy / 非 root / 只读根fs / seccomp / 资源限）与 TTL 清理生效，无泄漏。

## Risks

- **K8s 基础设施成本**：需一个可用集群、RBAC / service account 最小权限、集群可用性监控；这是把「动态扩缩容 + 插件化」换来的基础设施重量，比本地 Docker 重一档。
- **扩缩容与冷启动**：HPA / 自定义指标需要正确的指标来源与扩缩容器策略；Pod 冷启动（镜像拉取 / 调度）带来延迟，需 warm pool / 预载缓解。
- **镜像治理（供应链面）**：用户可自定义镜像后，信任边界扩大；需镜像白名单、签名 / 扫描、拉取策略、配额，防止恶意镜像与供应链风险。
- **安全策略正确性**：「允许 HTTP、禁危险操作」靠 Pod 安全上下文 + 网络策略 + 前置校验三道闸；任何一道疏漏都可能被逃逸，需非法用例证明（verify-*）。
- **控制面可用性**：控制面是单点，需考虑 HA（多副本 + 选举 / 队列）与降级；「配置错误大声失败」对集群不可达等前置条件要在启动即暴露。
- **资源配额平衡**：池 / Pod 数上限与资源 limits 要平衡突发并发与集群资源，需压测与配额管理。
- **local 实现隔离弱（仅开发）**：`LocalSandboxStrategy`（本地 python 子进程 / 单机 docker）隔离最弱，只作开发与 clone 即跑；若要「禁危险操作 + 强隔离 + 扩缩容」必须上 `kubernetes`。需文档明确其非生产定位，避免误用于生产。
- **选择策略即选择依赖面**：选 `kubernetes` 会拖入集群客户端等重依赖并依赖集群可用；选 `local` 轻但无扩缩容 / 插件化。二者通过 `sandbox.type` + 分模块避免相互污染。
- **放弃的东西**：放弃本地 Docker 的一步到位轻部署（换来扩缩容 / 插件化 / 更强隔离）；放弃沙箱与 master 一体（换来干净边界）；放弃「一个依赖包同时给简单 + k8s」的打包方式（换来按需引入、避免过重依赖）。若集群不可用且走 `kubernetes`，编码节点整体不可用——需在文档与监控中显式暴露该依赖。
