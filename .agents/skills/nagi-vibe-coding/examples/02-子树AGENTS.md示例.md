# DeepSeek Harness 子树 AGENTS.md（实例）

---

## packages/AGENTS.md（包规则，全译）
这些是包级规则，补充仓库级约定 `../AGENTS.md#conventions`。
- **插件导出**：服务包默认导出其服务类；函数插件命名导出 `name`/`inject`/`Config`/`apply` 且无默认导出。混用会让 Loader 丢弃函数插件的命名空间。
- **可选服务用 `ctx.get(name)`**：把 `ctx.<name>` 留给已声明注入；属性代理对拓扑敏感，严格的 `ctx.get` 读全局服务仓库。
- **产品可见插件需要非单元的真实组合测试**：手工装配套件不够，经 Loader 与应用/进程启动 test-only 配置，只 mock 外部服务或非确定性输入。
- **发起者拥有的私有链先派生再捕获**：在每个编排入口恢复对象、派生会话、让局部 helper 闭包它。
- **一个异步操作用一个生命周期控制器或事务表示**：分离的 readiness/取消/释放/预留/哨兵状态需要独立所有者或结算点。
- **为所有当前 Consumer 设计 Service Definition**：别让一个 Consumer 独断服务契约。
- **要求当前所有者与需求**：每个抽象、状态机、选项、防御性拷贝、兼容路径都绑定当前契约或生产消费方。
- **为公开选择要求证据**：可配置性不能为无支持默认值、公开操作集、格式或引入的外部概念背书。
- **从模型视角写模型向契约**：prompt、工具 schema、结果、诊断只含任务相关概念。
- **在做决定的操作里强制执行该决定**：schema 省略、prompt 过滤、门面、包装、监听顺序都不是「执行」，当直接或替代调用方能绕过它们时。
- **只在提交点发布状态**：每次通知与派生状态更新只在操作成功后发出。
- **对完整结果施加边界**：在「完整发出或保留的值」已知处强制字节/token/条目/时间限制。
- **注册表贡献证明释放**：dispose fiber 并观察移除。
- **每个包拥有 `./invariant`**：检查事件/数据关系，或给空安装器写包特定理由。
**命名规则**（「命名存在的角色」）：命名稳定**当前**职责，不命名首个实现/未来扩展/基类。`Controller`（接受命令改状态）/ `Store`（拥有一份数据做 CRUD）/ `Directory`（暴露条目供发现）/ `Presenter`（纯转换）/ `Registry`（拥有命名注册集合）/ `Runtime`（跑实时工作）/ `Resolver`（算一个答案）/ `Binder`（绑定已声明接口）。
---
## packages/client/AGENTS.md（Web 客户端栈，全译摘要）
- **槽位与 props 纪律**：一个插件只能通过 `ctx.slots.register({ name, children?, store?, inject? }, Component)` 组合 UI；`children` = 声明 + 授权；组件 props 是四个共享件（`PropsRuntime`/`PropsRenderSlots`/`PropsStore`/inject face），全部派生、不手写；hook 只能框架造。
- **响应式读取纪律**：渲染读取的一切可变数据都经框架 hook 进来；业务组件不含订阅机制；数据访问梯：框架 hook → 声明 store → inject 回调 → 其它都是新扩展点。
- **导出纪律**：`/client` 入口是公开浏览器 API，不是便利桶；同包测试直接导入内部；feature 插件不得运行时导入/重导出另一个 feature 插件。
- **ctx 纪律**：组件永不见 ctx；一切经四个 props 共享件。
- **分层红线**：数据对象层（无 React）→ 渲染机制 → 展示组件，知识单向。
- **Web 层是纯展示**：任何「仅如何绘制」都不进会话日志。
---
## 其它子树（摘要）
- **packages/experimental/AGENTS.md**：只有「完整公开契约是实验性或仅内部」的包放这里；实验状态**不放松**工程/安全/文档/生命周期/测试/不变式/快照要求；转正 = 移出 + 去前缀 + 原子更新每处引用。
- **packages/web/AGENTS.md**：**在携带凭证的提供方请求上拒绝重定向**——配置 HTTP 客户端在任何重定向响应前失败，回归覆盖证明重定向目标未被接触。
- **packages/schedule/AGENTS.md**：某会话的版本化变更流是唯一持久状态；fold 校验每个持久 JSON 边界并派生活跃记录；定时器/等待器/工具值是一次性投影。
- **snapshots/AGENTS.md**：本树只放「提交的会话 JSONL 是回放输入、且是预期持久化输出」的测试；每个场景拥有一个主 `session.jsonl`，只有所有者能录制/刷新；提交的会话是归一化不动点（易变身份用类型化 token 替换）。
- **.github/AGENTS.md**：Windows runner 作业在原生 `pwsh` 下运行；`ci.yml` 仅 PR，master 独占作业在 `ci-master.yml`（避免 PR 检查面板灰圈）。
---
## 结构点评（生成时对照）
1. **子树第一行声明「补充 `../AGENTS.md#conventions`」**——继承关系显式，绝不重复根规则。
2. **子树可以再嵌套**（`packages/` → `packages/client/`），粒度随「在该目录下工作才需要的规则」决定。
3. 每条规则仍是「一句话 + 依据链接（postmortem / Agent Note / 归属文档）」。
4. **映射时**：`ctx.`/slots/Loader 换成目标项目的 DI/组件系统；`invariant`/`Model Experience`/会话日志换成目标项目的「运行时自检」「可见效应」「可回放日志」或删。
