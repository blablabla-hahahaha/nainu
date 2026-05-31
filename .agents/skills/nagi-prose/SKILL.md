---
name: nagi-prose
description: 写/审/修剪文档与注释散文时使用——决定 Markdown、JSDoc、代码与测试注释里哪里需要文档、保留什么契约、删什么推理过程。含「思维链泄漏」审查。
disable-model-invocation: false
user-invocable: false
---

# 文风标准（nagi-prose）

写够以保存「契约」，然后删掉推理过程、重复与装饰。本技能是「引导，不是脚本/清单」——机械部分交给门禁脚本，这里只给判断框架。

## 真源（Sources of truth）

- [docs/AGENTS.md](../../../docs/AGENTS.md)：文档结构、写作规则、slop 清单
- [docs/defensive-patterns.md](../../../docs/defensive-patterns.md)：防御性模式（做生命周期/并发工作前读）
- [.agents/notes/README.md](../../notes/README.md)：决策记录格式与何时写

## 工作流

1. 确认范围与适用的 `AGENTS.md`（根 / web / 后端 / docs）。
2. 读归属代码后再判断一段话；保留每个命题：主体与动作、条件与顺序、情态、否定保证、所有权、副作用、失败模式。
3. 分类每个候选：keep / add / trim / restore / restructure / defer；先改所有者再改派生物。
4. 反「思维链泄漏」：一个在 HEAD、拿不到会话记录的读者能否解析每个引用、核实每个声明？不能 → 从仓库视角重述存活事实、删其余。
5. 跑窄检查（见下）。

## 验证

```sh
npm run verify:doc-sync   # 文档门禁（一段一行 / 相对链接 / 词数预算）
git diff --check          # 空白卫生
```
