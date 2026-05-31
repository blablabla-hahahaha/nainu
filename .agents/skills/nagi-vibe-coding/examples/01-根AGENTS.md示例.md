# DeepSeek Harness 根 AGENTS.md（实例）

---

## 项目定位
DeepSeek Harness 是一个全插件的 Cordis 智能体框架。改动 `packages/` 前先读架构文档；文档工作遵循文档规范。
## 发布前立场：地基优先于波及面
**在首个带标签发布时删除本段。** 在此之前，宁可要正确的地基，也不要兼容性垫片：可自由重命名/重新打包并更新每处引用。后端拒绝旧磁盘格式。
## 仓库布局
```
vendor/      vendor 化源码（manifest + 同步流程）
packages/    @deepseek-ai/dsh-<pkg> 工作区，位于 packages/<group>/<pkg>/
  core/        产品 API 主干：session、system-prompt、tools、agent、agent-loop
  llm/         LLM 能力：Service Definition/Consumer + DeepSeek 提供方
  shell/       bash 能力：Service Definition + 提供方 + Consumer
  …（其余分组从略）
.agents/      智能体工作流与 Agent Notes（notes/）
docs/         架构、生成目录、事故复盘、实操手册
scripts/      仓库门禁与生成器
website/      精选双语 docs/ 源的 VitePress 投影
```
## 常用命令
```sh
pnpm install            # pnpm workspaces, node ^22.19 || >=24
pnpm run test           # 单元测试
pnpm run test:coverage  # CI 覆盖率门禁：每文件 100%
pnpm run test:e2e       # 真实 API 测试；无 key 自动跳过
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run doc-sync       # 所有文档门禁
```
## 约定（Conventions）—— 这是核心，注意「一句话 + 链接」的形式
- 每个 npm 包都是 `@deepseek-ai/dsh-<name>`；`@deepseek-ai/cordis` 是每个 harness 包的 peerDependency。
- **ESM 无处不在**（`"type": "module"`）。
- **注册即副作用**：一切贡献经 `ctx.effect()` / `ctx.on()`；registry 的 `register()` 返回 disposer。
- **运行时不变式断言「自有关系」**：检查权威事件流或可变数据，而非服务/方法是否存在。
- **类型化事件用声明合并**；事件 JSDoc 需 `@mode` 与载荷 `@param`。
- **在判别标签上 switch**：封闭联合以 `assertNever` 收尾。
- **瀑布监听器必须调用 `next()`** 才能委派。
- **模型可见 ⟺ 已入日志**：任何进入模型请求的内容都必须能从会话日志重建。
- **用插件，不改循环**：新行为挂在文档化扩展点；改 `agent-loop` 需同步改架构文档。
- **能力接缝由「Service Definition / Service Provider / Consumer」三角色组成**。
- **优先维护良好的依赖，而非手搓**。
- **包边界处「显式 > 隐式」**。
- **禁止硬编码可调参数**：随部署变化的都是已验证 `Config` 字段。
- **配置错误大声失败**。
- **跨边界 id 加品牌**（`Branded<B>`）。
- **在类型化的同进程边界信任 TypeScript**。
- **源码平面 vs 产物平面，绝不混用**。
- **空 `catch` 写明吞掉了什么**。
- **注释保持局部**。
- **测试描述行为，不是正确性**。
- **非平凡变更必须同 PR 附 Agent Note**。
- **客户端 UI 文案本地化所有**。
- **两个 SDK 都投射循环**。
- **刻意选择 PR 历史**：重写用 `--force-with-lease`，从不裸 `--force`。
- **TODO 标记分级**：`FIXME` / `TODO` / `XXX`。
- 文件以恰好一个换行结尾。
## 防御性模式
做生命周期、并发、子进程或 teardown 工作前，先读防御性模式。
## 类型安全与文档
一切在 `strict: true` 下编译；每个残留 `any` 解释为何无法收窄。评论与文档陈述**完整契约，而非推理过程**。把「值得机械检查的不变量」接入顶层门禁，并证明每条改动的接受路径都拒绝一个非法用例。
## 编辑这些指令
`AGENTS.md` 是唯一的智能体指令入口。
## Vendor 化策略
`vendor/` 包是固定源码副本；按同步流程更新，重跑测试 + 构建。
---
## 结构点评（生成时对照）
1. **「项目定位 + 两个指针」** 是第一段——告诉智能体「改代码前读哪、写文档遵循哪」。
2. **「仓库布局」** 是 ASCII 目录树 + 每目录一句话，让智能体有地图。
3. **「约定」每条一句话 + 链接**，细节全部下沉到 docs/Agent Notes。
4. **结尾「编辑这些指令」** 说明符号链接关系，防止出现副本。
