---
name: nagi-agent-notes
description: 新增/更新/迁移/归档/审计 Agent Notes 决策记录时使用——判断何时写、套哪个生命周期骨架、如何迁移与归档。
disable-model-invocation: false
user-invocable: false
---

# 决策记录生命周期（nagi-agent-notes）

Agent Notes 是智能体书写的 RFC：保存依据、备选方案、后果与必需验证。本技能是「引导，不是脚本/清单」——语义判断在这里，骨架检查在门禁。

## 真源（Sources of truth）

- [.agents/notes/README.md](../../notes/README.md)：生命周期、类别、何时写、归档规则
- [.agents/notes/templates/agent-note-template.md](../../notes/templates/agent-note-template.md)：三态骨架
- [scripts/agent-note-tree.ts](../../../scripts/agent-note-tree.ts)：封闭集合的结构真源

## 工作流

1. 判断归属：非平凡变更（行为/架构/跨文件契约/流程/工具/测试策略/格式）必须附 note；已有决策 → 更新拥有它的 note，不要建重复。
2. 选生命周期：未来重大工作 → `proposed/`（`## Proposal` 可将来时，含 `## Acceptance criteria` + `## Risks`）；已交付 → `implemented/`（现在时 `## Decision` + `## Consequences`，禁 spec-speak 章节）。
3. 写 `## Alternatives considered`：每个真实备选 + 落选原因——「记录了决策却没记录它击败了什么，等于邀请重新争论」。
4. 迁移：proposed → implemented 改写骨架；proposed → rejected 只在 `Status:` 行加原因并冻结。
5. 归档：implemented 依据不再指导未来工作时，移动完整文件 + 插入 `Archived: YYYY-MM-DD` 行 + 重录哈希（`--write`）+ 修/删入站链接；封存后永久冻结。

## 验证

```sh
npm run verify:agent-notes   # agent-note-tree + verify-agent-note-format + verify-archived-agent-notes
```
