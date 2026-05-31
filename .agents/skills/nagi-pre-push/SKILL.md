---
name: nagi-pre-push
description: 推送/强推/声称「检查通过」之前使用——选覆盖 diff 的最小检查集，不重复已通过的检查。
disable-model-invocation: false
user-invocable: false
---

# 推送前检查（nagi-pre-push）

没有普遍本地基线：每个行为变更跑「最窄的、会在其回归上失败的」检查。本技能是「引导，不是脚本/清单」——选择判断在这里，执行在门禁。

## 真源（Sources of truth）

- [AGENTS.md](../../../AGENTS.md)：仓库级约定与门禁入口
- [scripts/run-gates.ts](../../../scripts/run-gates.ts)：门禁聚合与模式
- [docs/AGENTS.md](../../../docs/AGENTS.md)：文档写作与 slop 清单

## 工作流

1. 确认改动范围属于哪个子树（`web/` / 后端 / `docs/` / 根）——读对应 `AGENTS.md`。
2. 按改动选最窄检查集：
   - `web/` 改动 → `cd web && npm run lint && npx tsc -b --noEmit`（交付前三步校验）。
   - 后端改动 → `./gradlew build`（或单模块 `:nainu-agi-xxx:test`）。
   - 文档/常驻指令改动 → `npm run verify:doc-sync`。
   - 任何改动 → `npm run verify:all` + `git diff --check`。
3. 非平凡变更确认同 PR 附 Agent Note。
4. **不要**手动重复已通过的检查；历史改写用 `--force-with-lease`，裸 `--force` 永不。

## 验证

```sh
npm run verify:all
git diff --check
```
