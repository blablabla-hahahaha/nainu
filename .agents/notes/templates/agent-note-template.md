# Agent Note 模板

> 路径：`.agents/notes/{lifecycle}/{class}/yyyy-mm-dd-topic-title.md`。
> 生命周期：`proposed` / `implemented` / `rejected`（+ `archived` 冻结）。
> 类别（封闭集合）：`feature` / `bug-fix` / `simplification` / `architecture` / `process` / `testing`。
> 本仓库单语（中文），note 为单文件，无双语 sidecar。

## proposed/（提案）

```markdown
# Agent Note: <action-oriented title>

Status: proposed

## Problem

<动机：脱离解决方案也能独立成立。点名当前 API、文件、消费方证据。>

## Proposal

<拟议变更，可合理用将来时。精确说改什么、涉及哪些测试/文档/README/JSDoc/快照。>

…bespoke sections…（真正独特的技术章节，自由组织）

## Alternatives considered

<每个真实备选 + 落选原因；每个备选一个加粗引导段落，或对争议大的用 `### Why not <X>?`。>

## Acceptance criteria

<什么可观察状态意味着完成。>

## Risks

<可能出错之处 + 变更有意放弃的东西。>
```

## implemented/（已交付）

```markdown
# Agent Note: <title>

Status: implemented

## Problem

<动机。>

## Decision

<以现在时描述已交付现实。整个文件与之保持同步。>

…bespoke sections…

## Alternatives considered

<每个真实备选 + 落选原因。>

## Consequences

<权衡的代价与收益。>
```

**禁令**：`## Proposal`、`## Plan`、`## Migration plan`、`## Acceptance criteria` 不得出现在 implemented note（spec-speak，门禁拒绝）。

## rejected/（已否决）

```markdown
# Agent Note: <title>

Status: rejected — <why, in one line>

## Problem

<动机。>

## Proposal

<拟议变更。>

…保留提案期其余章节（含 Acceptance criteria / Plan）…

## Alternatives considered

<每个真实备选 + 落选原因。>
```

---

## 头部块（每份 note 前三行，严格）

```markdown
# Agent Note: <title>

Status: <proposed | implemented | rejected — 一句话原因>
```

后跟一个空行。`Status:` 必须与所在生命周期文件夹一致（门禁交叉检查）。

---

## 生命周期迁移

- `proposed/` → `implemented/`：`## Proposal` → 现在时 `## Decision`；`## Acceptance criteria` + `## Risks` 折入 `## Consequences`；计划替换为已交付内容。
- `proposed/` → `rejected/`：只在 `Status:` 行加原因并冻结。
- implemented → `archived/`：移动文件，不改正文，插入 `Archived: YYYY-MM-DD` 行，重录 [archived-manifest.json](../../../scripts/archived-manifest.json) 哈希（`node scripts/verify-archived-agent-notes.ts --write`），修/删入站链接，之后永久冻结。

## 硬规则

- **每个非平凡变更同 PR 至少附一份 Agent Note**。
- **`## Alternatives considered` 强制**——「记录了决策却没记录它击败了什么，等于邀请重新争论」。
- **永不把 note 编辑成一个「不同决策」**：用新 note 取代并交叉链接。
- **归档后永久冻结**：不编辑、更新、移动、删除。
