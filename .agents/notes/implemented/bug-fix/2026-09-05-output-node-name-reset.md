# Agent Note: 修复指定输出节点名称被设置面板重置为默认名

Status: implemented

## Problem

默认工作流中「指定输出」（DEBUG）节点可手动命名（如「分支一」「分支二」）。点击这类节点后，节点名称在打开设置面板的瞬间被重置为默认名「指定输出」，手动名称丢失。

## Decision

- [output-settings.tsx](../../../../web/src/pages/workflow/nodes/output/output-settings.tsx)：去掉 `graph/update_node` 载荷里对 `name` 的覆写，设置面板只同步 `jsonTemplate` 与输入/输出字段。节点名改由 `NodeSetting` 卡片标题的 `EditableText` 维护（其在 `handle_label_change` 里单独派发 `graph/update_node` 更新 `config.name`）。

## 根因

`OutputSettings` 使用 `Form.useWatch([], form)` 监听整份表单值写回 canonical 图，构造更新载荷时写了 `config: { ...current_config, name: watched.label ?? '指定输出', jsonTemplate }`。但该面板的表单没有注册 `name`（label）对应的 `Form.Item`，`useWatch` 读不到该字段，`watched.label` 恒为 `undefined`，于是每次设防都把它兜底成默认名「指定输出」，覆盖了用户手动名称。输出字段/模板照常同步，唯独名称被误重置。

同类面板 `ScriptSettings` 的更新载荷不覆写 `name`（`next_config = { ...current_config, language, script }`），故编码节点无此问题。

## Alternatives considered

**在设置面板渲染一个可见的名称输入框（`name="label"`）**：让 `useWatch` 读到名称并受控写回；但与卡片标题 `EditableText` 的名称编辑入口职责重叠，出现两个改名的入口，未采用。

**保留 `name` 覆写但用 `watched.label ?? current_config['name']` 兜底**：仍依赖 `useWatch` 读到一个其实不存在的字段，语义混乱；既然名称不由本面板管理，应直接不写它，未采用。

## Consequences

- 点击任意「指定输出」节点不再重置其手动名称；名称仍经卡片标题 `EditableText` 编辑。
- `jsonTemplate` 与输入/输出字段的实时同步行为不变。
- `build_initial_output_settings` 中的 `label` 值仍作为表单初值保留，但不再被 `useWatch` 流写回名称（仅作内部推导，无副作用）。
