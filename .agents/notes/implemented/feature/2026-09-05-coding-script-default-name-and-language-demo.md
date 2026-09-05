# Agent Note: 编码脚本节点默认名与切语言教学 demo

Status: implemented

## Problem

画布菜单新增的 SCRIPT 节点以 `{ id, type: 'SCRIPT' }` 落图、不带 `config.name`，[canonical.ts](../../../../web/src/components/workflow/graph/canonical.ts) 的 `node_name` 仅回退到 DSL 类型名，于是节点卡片和设置面板标题显示英文的 `SCRIPT`，而非可读名称。同时 [script-config.ts](../../../../web/src/pages/workflow/nodes/script/script-config.ts) 的 `default_script_by_language` 只给出 `return {}`——过于空泛，演示不了「定义 `main()`、返回对象对应输出字段」的契约；编辑器下拉切语言只切换编辑器语言、不改脚本内容，切换后旧语言的代码留在新语言上下文里，起不到教学/快速开始的作用。

## Decision

- `node_name` 的回退从裸 `node.type` 改为「类型 → 默认显示名」映射 `default_node_name_by_type`，当前登记 `SCRIPT: '编码脚本'`，其余类型仍回退到 DSL 类型名。此举让「新增即展示中文名」集中在显名逻辑里，而非散落在各创建点。
- [workflow-page.tsx](../../../../web/src/pages/workflow/workflow-page.tsx) 的默认工作流 `code` 节点 `config.name` 与 SCRIPT 节点的注册表菜单 `label` 由 `编码节点` 统一改为 `编码脚本`，节点概念命名一致。
- `default_script_by_language` 改为每语言一个小型教学 demo，两语言结构对齐：`main()` 内先写一个局部变量再返回对象，并附一行注释指引「在这里编写你的逻辑；返回值将写入节点输出字段」。
- [script-settings.tsx](../../../../web/src/pages/workflow/nodes/script/script-settings.tsx) 向 Monaco 组件传入 `on_language_change`：仅当当前脚本仍是某个语言的默认 demo（未被用户改写，[script-config.ts](../../../../web/src/pages/workflow/nodes/script/script-config.ts) 新增的 `is_default_script` 判定）时，重写为新语言的 demo；用户已手写的代码保持不变。

## Alternatives considered

**切换语言时一律重写脚本**：实现最简单、脚本与语言恒一致，但会清掉用户手写代码，破坏性太大；未采纳。

**在 `node-menu.tsx` 创建节点时写入 `config.name: '编码脚本'`**：把 SCRIPT 专属默认值耦合进通用的「新增节点」菜单，后续每种类型的默认配置都要往菜单里堆；未采纳，改为集中于显名逻辑。

**把 `node_name` 回退做成全类型中文名映射**：覆盖全部节点类型、改动面更大，而本任务只点名 SCRIPT 的用户可见默认名；未采纳，仅登记需要可读默认名的类型，其余维持 DSL 类型名。

## Consequences

- 新增的 SCRIPT 节点与默认工作流的 `code` 节点、添加节点菜单项均显示 `编码脚本`。
- 语言切换发生在未改写的 demo 上时，脚本与语言同步切到目标语言的 demo（双向皆然），呈现「快速开始」的引导价值；手写后的脚本在切换语言时不被覆盖，代码保留、语言跟随选择——刻意取舍：写入代码后再切换语言可能出现脚本语言与所选语言不一致，但用户工作不丢。
- 语言持久化依赖 `language` 作为注册表单字段；之前 `language` 未注册导致语言卡在 `javascript`、Python 被当 JS 执行，相关修复见 [2026-09-05-script-language-not-registered-desync.md](../bug-fix/2026-09-05-script-language-not-registered-desync.md)。
