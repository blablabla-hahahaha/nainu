# Agent Notes（决策记录）

Agent Notes 记录一个影响代码库的决策或提案——代码和文档承载不了的**「为什么」和「放弃了什么」**。一句话：**Agent Notes 是由智能体书写的 RFC**——持久的提案与决策记录，保存依据、备选方案、后果与必需验证。

## 布局与命名

每份 Agent Note 有两个维度，都编码在**路径**里：`.agents/notes/{生命周期}/{类别}/yyyy-mm-dd-标题.md`。

- **生命周期**（顶层文件夹）是状态，随状态变化在文件夹间移动：
  - `proposed/` — 实施前评审的提案；尚未构建（或仅部分构建）。
  - `implemented/` — 决策已交付。记录做了什么决定、否决了什么，并**与实际交付内容保持同步**（代码后来移动文件/改名/改默认值时，note 同变更更新——仅事实，非决策本身）。
  - `rejected/` — 提案被考虑后被否决。仅当其依据仍能避免一种诱人且影响重大的错误时保留；否则删除。
  - `archived/` — implemented 记录冻结归档（见「归档与删除」）。
- **类别**（嵌套文件夹，**封闭集合**，由 [agent-note-tree](../../scripts/agent-note-tree.ts) 强制）：见下表。
- 文件名日期是该主题**首次提出**的时间。交叉引用用相对 Markdown 链接，**绝不用**纯文字或编号。
- 活跃生命周期树就是工作清单；**不要**加集中式 `INDEX.md`（浏览/搜索即可）。

## 分类（封闭集合）

| 类别 | 覆盖范围 |
|---|---|
| `feature` | 面向用户/模型的新能力 |
| `bug-fix` | 修正缺陷或弥补事故复盘暴露的缺口 |
| `simplification` | 在不增加能力的前提下移除代码、行为或对外范围 |
| `architecture` | 关于**交付源码**的结构性决策 |
| `process` | 代码**周边**的工具、策略或工作流 |
| `testing` | 测试基础设施与策略 |

关键判别：`architecture` = 关于我们交付的源码；`process` = 围绕源码的工具与工作流（`refactor` 被有意排除——与 `simplification` 重叠）。新增类别需同时更新本表与 [agent-note-tree.ts](../../scripts/agent-note-tree.ts)。

## 何时需要写一份

**每个非平凡变更都必须在同一 PR 中新增或更新至少一份 Agent Note。**

非平凡 = 修改了行为、架构、跨文件或跨包共享契约、流程或工具、测试策略、磁盘/线上/配置格式、或维护者可能合理重新审视的其它决策。未来重大工作从 `proposed/` 开始；已做决策从 `implemented/` 开始。

- 更新已拥有该决策的 note 即可满足规则，**不要**创建重复。
- 只有纯机械/局部编辑豁免。
- **永不把 note 编辑成一个「不同决策」**：用新 note 取代并交叉链接。
- **完全取代**的 implemented note 可合并删除，但删除前必须把每个独有依据/备选/后果/验证/覆盖缺口迁移到现任所有者；**部分取代**保留两份交叉链接。

## 文件格式（由 verify-agent-note-format 强制）

### 头部块（前三行严格）

```markdown
# Agent Note: <title>
Status: <status>
```

后跟一个空行。`Status:` 值三种、且必须与生命周期文件夹一致（门禁交叉检查）：

- `Status: proposed`
- `Status: implemented`
- `Status: rejected — <why, in one line>`

状态行不带日期、不带括号补充；拒绝原因是唯一带内容的状态（读者查阅被否决 note 时，结论正是他们要的）。

### 正文骨架

以 `## Problem` 开头（动机，脱离方案也能独立成立）。固定章节用规范名、仅限这些名；真正独特的技术章节在必需章节间自由组织。

- **`proposed/`**：`## Problem` → `## Proposal`（可将来时）→ …bespoke… → `## Alternatives considered` → `## Acceptance criteria` → `## Risks`。
- **`implemented/`**：`## Problem` → `## Decision`（现在时）→ …bespoke… → `## Alternatives considered` → `## Consequences`。**禁令**：`## Proposal`/`## Plan`/`## Migration plan`/`## Acceptance criteria` 不得出现（spec-speak，门禁拒绝）。
- **`rejected/`**：冻结的提案，结论写在 `Status:` 行。

完整模板见 [templates/agent-note-template.md](templates/agent-note-template.md)。

### 曾考虑的备选方案 —— 强制

每份 note 都**必须**有 `## Alternatives considered`：每个真实备选 + 落选原因。

> **记录了决策却没记录它击败了什么，等于邀请重新争论**——这正是 Agent Note 要防止的失败。

备选是记录下来的，不是编造的。

## 生命周期迁移

- `proposed/` → `implemented/`：`## Proposal` → 现在时 `## Decision`；`## Acceptance criteria` + `## Risks` 折入 `## Consequences`；计划替换为已交付内容。
- `proposed/` → `rejected/`：只在 `Status:` 行加原因并冻结。
- `implemented/` → `archived/`：见下。

## 归档与删除

- implemented note 记录**已完整落地、且依据不太可能再指导未来工作**时归档；备选/所有权边界/否定保证/持久语义/安全规则/重引入条件仍有价值就保持活跃。
- **绝不归档 proposed**（过时提案转 rejected）；**rejected 仅当仍能防止一个可能错误时保留**，否则删除。
- 归档路径 `archived/{类别}/…`（`implemented` 有意缺失——只有 implemented 能进归档）。归档变更：移动文件、保留 `Status: implemented`、插入 `Archived: YYYY-MM-DD` 行、重录 [archived-manifest.json](../../scripts/archived-manifest.json) 哈希、修复或删除入站链接。**归档时只允许这些内容变更。**
- 封存后**永久冻结**：不编辑、更新、移动、删除，也不作为当前行为权威。`verify-archived-agent-notes` 强制归档元数据与冻结内容哈希。

## 机械强制

| 规则 | 门禁 |
|---|---|
| 封闭生命周期/类别集合 + 命名 `yyyy-mm-dd-*.md` | [agent-note-tree](../../scripts/agent-note-tree.ts) 结构真源 |
| 头部块 + 生命周期骨架 + `## Alternatives considered` | [verify-agent-note-format](../../scripts/verify-agent-note-format.ts) |
| 归档元数据 + 冻结内容哈希 | [verify-archived-agent-notes](../../scripts/verify-archived-agent-notes.ts) |
