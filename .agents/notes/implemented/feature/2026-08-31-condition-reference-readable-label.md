# Agent Note: 条件分支节点迷你视图的引用显示为可读标签（节点名 → 字段）

Status: implemented

## Problem

条件分支节点卡片上 CASE 分支里的 compare 字段，`INTERNAL_REF` 引用直接显示技术层值 `debug:username`（`nodeId:字段名`），对用户不友好。用户希望显示成「指定输出 → username」这样的完整可读引用（能看出是哪个节点、哪个字段）。

## Decision

- [node-field.ts](../../../../web/src/components/workflow/extends/node-field/node-field.ts) 新增纯函数 `internal_ref_label(value, node_labels)`：把 `nodeId:refName` 解析为「节点显示名 → 引用名」，节点未找到或格式非法时回退原始值，绝不抛错。
- [condition-node.tsx](../../../../web/src/pages/workflow/nodes/condition/condition-node.tsx) 经 `useWorkflowState` 构建 `nodeId → 显示名` 的 map，串到 [branch-operator-view.tsx](../../../../web/src/pages/workflow/nodes/condition/branch-operator-view.tsx) 再传给 [compare-operator-view.tsx](../../../../web/src/pages/workflow/nodes/condition/compare-operator-view.tsx)；后者仅对 `INTERNAL_REF` 字段用该 helper 渲染，其余字段仍用 `stringifyField`。
- 引用名取 `keyAlias ?? key`，与 `compute_internal_ref_options` 的下拉 option 标签（`${node_label} → ${ref_name}`）保持一致。

## Alternatives considered

**CompareOperatorView 内直接 `useWorkflowState` 取 nodes**：少一层串参，但把迷你视图组件耦合到图状态上下文，违背「视图组件 props 显式」倾向。未采用。

**在 `condition_to_branch` 里把 field.value 预替换为标签文本**：会破坏与 `branch_to_condition` 的双向转换（后者需要原始 `value` 才能 round-trip），改声明值而非展示层。未采用。

## Consequences

- 条件分支节点卡片上的引用显示为「节点名 → 字段」可读标签；引用名沿用 `keyAlias ?? key`，与下拉 option 一致。
- 纯前端展示层改动，不触及 DSL 结构 / trace / 后端；`verify-dsl-contract` round-trip 与 DSL 语义不变。
