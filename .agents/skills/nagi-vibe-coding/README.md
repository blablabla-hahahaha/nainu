# nagi-vibe-coding（技能）

这是一个**技能**。迁移到目标项目时，把本目录放到目标项目的 `.agents/skills/nagi-vibe-coding/` 下（或用符号链接指向本目录）。技能入口是 [SKILL.md](SKILL.md)。

加载并调用本技能后，AI 会读取 `references/`（通用标准）、`examples/`（参考实现）与 `templates/`（可直接填空的骨架），**直接为目标项目生成一套适配的 vibe-coding 架构**。

## 目录

- `SKILL.md` —— 技能入口（frontmatter + 生成流程 + 决策点映射表）
- `references/` —— 生成时要读的通用标准（9 份，可直接拷贝）
- `examples/` —— 参考实现（看形状，不照抄，5 份）
- `templates/` —— 可直接填空的骨架（4 份）
