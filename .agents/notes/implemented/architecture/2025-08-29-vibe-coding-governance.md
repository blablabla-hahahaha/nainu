# Agent Note: 为 nainu-agi 建立智能体自我治理体系

Status: implemented

## Problem

仓库缺少对编码智能体的治理：根 `AGENTS.md` 只有路由表，没有常驻约定；决策只存在于 commit 消息与聊天记录里，没有「为什么、放弃了什么」的持久记录；值得机械检查的规则（一段一行、链接、Note 骨架、词数预算）没有脚本强制，纯文字规范会随会话腐烂。

## Decision

仓库落地五层治理体系，全部以本仓库技术栈（Gradle 多模块 Java + web/ TypeScript）实现：

- **指令分层**：根 `AGENTS.md` 只写常驻命令（每条一句话 + 链接），子树 `AGENTS.md`（`web/`、`nainu-agi-common/`、`docs/`）声明「补充 `../AGENTS.md#conventions`」并只写子树特有规则；`AGENTS.md` 是唯一的智能体指令入口。
- **决策留痕**：`.agents/notes/` 采用 `{生命周期}/{类别}/yyyy-mm-dd-标题.md` 结构；生命周期 `proposed / implemented / rejected`（+ `archived` 冻结），类别为封闭集合 `feature / bug-fix / simplification / architecture / process / testing`；每份 note 强制 `## Alternatives considered`；每个非平凡变更同 PR 附 note。
- **机械门禁**：`scripts/verify-*.ts` 一条规则一个脚本（一段一行、相对链接、Note 骨架、词数预算、TODO 分级、文件卫生、归档冻结），`scripts/run-gates.ts` 聚合调度，每条门禁配非法用例 spec 证明它能失败。Node ≥ 23.6 原生执行 TypeScript，零构建。
- **技能体系**：`.agents/skills/` 沉淀可复用工作流（文风、文档、决策记录、推送前检查），权威契约在 docs、流程在技能、机械检查在 scripts。
- **单语**：仓库统一中文，不引入双语配对。

## Alternatives considered

- **只扩充根 `AGENTS.md` 而不建门禁** —— 否决：规则无机械兜底必然腐烂，这正是本体系要解决的问题；「值得保留的不变量，就值得编码成可执行的校验脚本」。
- **为 web/ 与后端各建独立门禁工具链** —— 否决：门禁是仓库级治理，统一在根 `scripts/`，web 的 lint/tsc/build 仍是其子树交付校验。
- **给 Agent Notes 加双语三件套** —— 否决：仓库单语（中文），双语配对为不存在的概念硬造规则。
- **把规则细节写进 SKILL.md** —— 否决：权威契约住在文档，技能只留工作流；不加载技能就编辑文档的智能体也要能读到权威。

## Consequences

- 常驻文档受词数预算护栏约束，新增内容需要「置换」而非堆叠。
- 每个非平凡变更多一步 Agent Note 义务，换来「备选方案被记录、争论不再重演」。
- 门禁变红是特性不是故障：每条 verify-* 都有非法用例，红 = 规则在起作用。
