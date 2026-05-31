# AGENTS.md 模板（根 + 子树）

> 直接套用。`<...>` 为需替换占位。指令入口只有 `AGENTS.md`。

---

## 根 AGENTS.md

```markdown
# AGENTS.md

<项目一句话定位>。改动 <核心代码目录> 之前先读 [docs/architecture.md](docs/architecture.md)；文档工作遵循 [docs/AGENTS.md](docs/AGENTS.md)。

## 仓库布局

```
<目录树：每个目录 + 一句话职责>
```

## 常用命令

```sh
pnpm install            # <依赖管理说明>
pnpm run test           # 单元测试
pnpm run test:coverage  # CI 覆盖率门禁
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run doc-sync       # 所有文档门禁
```

## 约定（Conventions）

- <规则一：一句陈述 + 指向它的家的链接>
- <规则二：…>
- **模型可见 ⟺ 已入日志**：任何进入模型请求的内容都必须能从日志重建（<链接>）。
- **非平凡变更必须同 PR 附 Agent Note**（[范围](.agents/notes/README.md#when-to-write-one)）。
- TODO 标记按紧迫度：`FIXME` / `TODO` / `XXX`（[语义](docs/development.md)）。

## 编辑这些指令

`AGENTS.md` 是唯一的智能体指令入口。每条规则自足，同时链接高层文档。
```

**要点**：根文件只写「每次都要知道」的常驻命令，每条一句话 + 链接；词数设上限（本项目根 `AGENTS.md` ≤ 1,950 词），细节全部下沉。

---

## 子树 AGENTS.md（`<subdir>/AGENTS.md`）

```markdown
# AGENTS.md — <子树名>

这些规则补充仓库级约定 [../AGENTS.md#conventions](../AGENTS.md#conventions)。

- <该子树特有规则一>
- <该子树特有规则二，含指向依据 Agent Note / 归属文档的链接>
```

**要点**：
- 第一行声明「补充 `../AGENTS.md#conventions`」，绝不重复根规则；
- 只写该子树特有、且在该子树下工作才需要的规则；
- 子树也能再嵌套（如 `packages/client/AGENTS.md`）。

---

## docs/AGENTS.md（文档子树指令）

```markdown
# AGENTS.md — 文档规范

本文件定义文档结构、Markdown 层级、写作规则与词数预算上限。使用 <dsh-doc 技能> 做放置与校验，<dsh-prose-standard 技能> 做必需覆盖与编辑判断。

## 层级分类法：一个事实一个家

每个事实只有一个家：职责匹配的那一层；别处用链接指过去。

| 层 | 职责 | 不该出现在这里 |
|---|---|---|
| 根 `AGENTS.md` | 常驻命令 | 故事、演练示例、复述链接家已承载的内容 |
| 子树 `AGENTS.md` | 该子树特有命令 | 根文件已承载的仓库级规则 |
| `architecture.md` | 有序地图 | 类型定义、逐包细节、决策依据、状态标注 |
| Agent Notes | 决策记录：为什么、放弃了什么、必需验证 | 迁移计划、验收清单、已交付后的 spec-speak |
| `cookbook/` | 分步 how-to | 设计依据（→ 指南链接的 Agent Note） |
| 包 README | 逐包契约 | JSDoc 复述、生成目录复述 |

## 写作规则

- 只写当前状态，不写变更历史（避免 "previously/now/no longer"、PR、commit）。
- 每个非平凡变更同 PR 至少附一份 Agent Note。
- 一段一行（`verify-md-wrap`）。
- 围栏 `ts` 块必须能编译（`doc-typecheck`）。
- 评论与 JSDoc 陈述完整契约，而非推理过程。

## 词数预算

`scripts/doc-budgets.manifest.json` 设上限；`verify-doc-budgets` 拒绝超限或缺失。
门禁变红时：1) 搬迁 → 2) 精简 → 3) 提高上限（PR 里说明理由）。
上限是护栏不是削减目标；低于目标留至少 5% 冗余、棘轮收紧。

## slop 清单

- 同一规则出现在多个家；叙述历史/战争故事；状态标注；手写复述目录；
- 推理过程；兄弟方法旁重复依据；段落墙；强调通胀；implemented note 里的 spec-speak。

## 交叉引用

用相对 Markdown 路径链接，绝不用裸文件名或编号；`verify-md-links` 拒绝死链。
```
