# Agent Note: 编码脚本 language 字段未注册导致语言不持久化

Status: implemented

## Problem

脚本设置面板（[script-settings.tsx](../../../../web/src/pages/workflow/nodes/script/script-settings.tsx)）的脚本语言由 Monaco 下拉经 `form.setFieldValue('language', lang)` 写入（[monaco-code-editor-item.tsx](../../../../web/src/components/monaco-code-editor/monaco-code-editor-item.tsx)），但 `language` 从未被注册为 `Form.Item` 字段。写 config 的副作用用 `Form.useWatch([], form)` 观测表单值，其快照取 `getFieldsValue()`——只含已注册字段（见 @rc-component/form 的 `useWatch` / `getFieldsValue`）。于是 `watched.language` 恒为 `undefined`，副作用把 config 的 `language` 写回默认 `javascript`：切到 Python 后脚本被替换为 Python demo（脚本是注册字段、可观测），config 的 `language` 却仍是 `javascript`。表现即「JavaScript 下拉 + Python 代码」，且每个节点的 `language` 都卡在 `javascript`（看似全局）；运行时沙箱据此用 Node 执行 Python `main()`，报 `Module._load`/语法错误。Python 本身能跑（[LocalSandboxStrategy](../../../../sandbox/nainu-agi-sandbox-local/src/main/java/nainu/top/agi/sandbox/local/LocalSandboxStrategy.java) 的 `python3` 路径正常），失败纯因语言/脚本错配。

## Decision

- **注册 `language` 为表单字段**：在 `<Form>` 内加 `<Form.Item name="language" hidden><Input /></Form.Item>`，使 `Form.useWatch` 观测到它并把它写进 config，修好「语言不持久化、看似全局」。
- **语言切换原子写入**：`handle_language_change` 在脚本仍是默认 demo 时改用 `form.setFieldsValue({ language, script })` 一次写两个字段，语言与脚本恒配对。
- **兼容既有错配**：[script-config.ts](../../../../web/src/pages/workflow/nodes/script/script-config.ts) 的 `build_initial_script_values` 在 config 的 `script` 恰是某语言默认 demo、但 `language` 与之不一致时，让 `language` 随脚本对齐，打开历史错配节点即自动纠正。

## Alternatives considered

**在副作用里读 `form.getFieldValue('language')`**：能改正错误读值，但副作用仍需在语言变化时重跑，而未注册字段的改变未必触发 `useWatch` 重渲染，语言单变（脚本不再是 demo 时的切换）仍不会持久化；未采纳，改为注册字段。

**改 MonacoCodeEditorItem 渲染 `language` 的 Form.Item**：该组件被 output-settings 复用（无语言切换），改动共享组件波及面更大；未采纳，注册动作局部放在脚本设置面板。

**切换语言时一律覆盖脚本**：会让语言/脚本恒一致，但丢弃用户手写代码；未采纳（与功能决策一致，见下表链接）。

## Consequences

- 配置面板切换到 Python 后 `config.language` 正确持久化为 `python`，节点以 `python3` 执行并成功。
- 语言按节点各自持久化，不再「全局」；一个节点的语言切换不波及其它节点。
- 打开历史错配节点（language=javascript + python demo）会自动显示并保存为 python + python demo。
- 语言与脚本在「默认 demo」场景下恒配对；用户手写代码在切换语言时不被覆盖（双字段仅在脚本仍是默认 demo 时重写）。

## Links

- 相关功能决策：[2026-09-05-coding-script-default-name-and-language-demo.md](../feature/2026-09-05-coding-script-default-name-and-language-demo.md)
