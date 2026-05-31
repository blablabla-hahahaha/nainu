---
name: nagi-doc
description: 新建/重构/评审/审计 Markdown 文档、模块 README 时使用——决定文档放哪层、什么粒度、套哪个模板、如何过门禁。
disable-model-invocation: false
user-invocable: false
---

# 文档工作流（nagi-doc）

每个事实只有一个家——职责匹配的那一层；别处用链接指过去。本技能是「引导，不是脚本/清单」——放置判断在这里，机械检查在门禁。

## 真源（Sources of truth）

- [docs/AGENTS.md](../../../docs/AGENTS.md)：层级分类法、词数预算、slop 清单、交叉引用
- [.agents/notes/README.md](../../notes/README.md)：决策记录（「为什么」的家）
- [.agents/notes/templates/agent-note-template.md](../../notes/templates/agent-note-template.md)：Agent Note 骨架

## 工作流

1. 读根 `AGENTS.md` 与 docs/AGENTS.md 的层级分类法，确定该文档的家。
2. 分类页面：tutorial（沿有序路径走向结果）或 reference（定义查找范围与当前行为）；substantial 的教程与参考内容分开。
3. 设允许粒度：只描述自己主题，直接子级只给目的/职责/高层行为，低层细节链接到归属后代。
4. 放好再写：用链接替换低层解释，搬迁后代拥有的细节。
5. 只写现状：不写 "previously / now / no longer / PR / commit"；变更故事进 Agent Note。
6. 核实每个声明——「只有跑过它才是操作声明的证据」。
7. 跑聚焦检查。

## 验证

```sh
npm run verify:doc-sync   # md-wrap / md-links / doc-budgets
npm run verify:spec       # 门禁自检
```
