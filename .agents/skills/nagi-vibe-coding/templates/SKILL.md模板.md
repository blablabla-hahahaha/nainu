# SKILL.md 模板

> 放在 `.agents/skills/<name>/SKILL.md`。

```markdown
---
name: <my-skill>
description: <一句「何时用」的话——会被技能目录自动展示给智能体。>
disable-model-invocation: false   # 可选：true 则禁止模型自动加载，只能用户显式点名
user-invocable: false             # 可选：true 则用户可显式调用
---

# <技能标题>

<一句话定位 + 本技能是「引导，不是脚本/清单」。>

## 真源（Sources of truth）

- [AGENTS.md](../../../AGENTS.md)：<常驻约定>
- [docs/<契约>.md](../../../docs/<契约>.md)：<权威契约>
- [Agent Notes](../../notes/README.md)：<决策依据>

## 工作流

1. <步骤一：确认范围/模式/分支…>
2. <步骤二：读权威 + 归属代码…>
3. <步骤三：分类每个候选…>
4. <步骤四：先改所有者，再改派生物…>
5. <步骤五：跑窄检查 + 报告实际跑过的检查…>

## 验证

<列出归属的验证命令，如 `pnpm run doc-sync`、`pnpm run lint`、`git diff --check`>
```

**三条铁律**：

1. **技能是「引导」，不是脚本 / 清单**——机械部分交给门禁脚本，技能只给判断框架。
2. **「工作流」与「权威契约」分离**——权威内容链接回 docs，技能只留流程。
3. **`references/` 按需加载**（每个引用从 SKILL.md 直接链接），避免深引用链。

**配套目录**：

```
.agents/skills/<name>/
  SKILL.md              # 主入口（frontmatter + 引导式正文）
  references/<x>.md     # 按需加载的详细参考
  templates/<x>.md      # 可套用的骨架
  scripts/<x>.<ext>     # 脚本（如编码器）
```
