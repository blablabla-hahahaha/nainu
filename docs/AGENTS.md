# AGENTS.md — 文档规范

本文件定义 `docs/` 的文档结构、Markdown 层级、写作规则与词数预算上限；对全仓库人类可读文档生效（Agent Notes 决策记录除外，见 [.agents/notes/README.md](../.agents/notes/README.md)）。

## 层级分类法：一个事实一个家

**每个事实只有一个家——职责匹配的那一层；别处用链接指过去。**

| 层 | 职责 | 不该出现在这里 |
|---|---|---|
| 根 `AGENTS.md` | 常驻命令：每条 1–3 行并链接其家 | 故事、演练示例、从链接的家复述的内容 |
| 子树 `AGENTS.md` | 该子树特有命令 | 根文件已承载的仓库级规则 |
| `docs/vision.md` | 北极星文档：项目方向、演化路线与第一性原理，约束当下决策 | 实现细节、决策依据 |
| `docs/technical-architecture.md` | 系统模块总览与通信模式的有序地图 | 类型定义、逐模块细节、决策依据 |
| `docs/master-design.md` | Master 子系统的参考：DSL、Redis Key、Checkpoint | 行为叙述、决策依据 |
| Agent Notes（`.agents/notes/`） | 决策记录：为什么、放弃了什么、必需验证 | 迁移计划、验收清单、已交付后的 spec-speak |
| `web/docs/design/` | web 子系统设计参考 | 根 docs 已承载的仓库级规则 |
| 包/模块 README | 逐模块契约：config、语义、限制、扩展点 | JSDoc 复述、生成目录复述、别的模块的事 |
| Skills（`.agents/skills/`） | 可复用工作流与专项决策标准 | 产品与运行时契约（→ 文档或源码） |

**放置口诀**：依据 → Agent Notes；流程 → cookbook（尚不存在则建）；类型定义 → 归属子系统文档；模块契约 → README；常驻命令 → 根 `AGENTS.md` + 依据链接。

## 写作规则

- 只写当前状态，不写变更历史；持久散文避免 "previously / now / no longer / renamed / PR / commit"，变更故事放进 commit 与 Agent Note。
- 每个非平凡变更同 PR 至少附一份 Agent Note（更新拥有该决策的 note 或新增；纯机械/局部编辑豁免）。
- **一段一行**：编辑器软换行，段落不手动折行（`verify-md-wrap` 门禁）。代码块、表格、列表结构保持原格式。
- 围栏代码块必须能编译/校验：文档里的代码要么真实可运行，要么标注为示意。
- 重塑了某文档化类型的同一变更要更新归属页。
- 评论与 JSDoc 陈述完整契约，而非推理过程：保留行为、失败、时序、所有权、异常、后果；删除叙述与代码复述。
- 写直接点：点名主体与事实，用确切名字，不用隐喻。

## 词数预算

[scripts/doc-budgets.manifest.json](../scripts/doc-budgets.manifest.json) 设上限；`verify-doc-budgets` 拒绝超限或缺失（清单里有但文件缺失 = 失败，防止重命名悄悄孤立预算）。

门禁变红时按序：1) **搬迁**属于别层的内容（留一行链接）；2) **精简**属这里但能更短的内容；3) 只有词确实需要空间才**提高**上限（在 PR 里说明理由）。

上限是护栏不是削减目标：低于目标保留至少 5% 冗余；高于目标冻结上限、禁止增长直到降回目标以下；只有仍有空间才降低上限。

词数口径：拉丁词按空白分词计 1，中文字符每个计 1（`AGENTS.md` = 1 词；`验证脚本` = 4 词）。

## slop 清单

任何文档审查都要猎杀：

- 同一规则出现在不止一个家（留一个家，其余链接）。
- 叙述历史或战争故事（"previously / now / no longer / PR / commit"）。
- 实现状态标注（"implemented!" / "future: …"）——状态会腐烂。
- 手写复述的目录、JSDoc、测试/模块/状态清单——源码或生成器才是权威。
- 推理过程（逐步实现叙述、被否决的局部备选）——保留结果契约，删除推导路径。
- 段落墙（一段塞好几条规则）——拆分或降级细节到其家。
- 强调通胀（到处 bold / CAPS）——强调只留给「改变行为的那句」。
- implemented Agent Note 里的 spec-speak（"should"、迁移计划、验收清单）。

## 交叉引用

用**相对 Markdown 路径**链接仓库引用，绝不用裸文件名或编号；`verify-md-links` 拒绝缺失目标与死 `#fragment` 锚点。
