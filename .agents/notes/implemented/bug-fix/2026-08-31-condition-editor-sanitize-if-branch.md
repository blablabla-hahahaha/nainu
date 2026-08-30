# Agent Note: 条件分支编辑器产出非法 IF/ELIF 条件（缺 compare 或缺 logicOperator）导致 DSL 校验失败

Status: implemented

## Problem

在条件分支设置面板里配置/切换比较运算符后运行，后端报「DSL 校验失败：节点 condition 的 IF 分支必须携带逻辑表达式」。根因有两个入口，都会让写出的 IF/ELIF 条件在后端 `DslValidator` 校验失败（`logicOperator==null || conditions==null || conditions.isEmpty()`）：

- **缺 `logicOperator`**：`branch-operator-form.tsx` 仅在 `compares.length > 1` 时渲染「逻辑」Toggle，单条 compare 的 IF/ELIF 分支不渲染这个 `Form.Item`。于是 `onValuesChange` 的 `allValues.branches` 里该分支没有 `logic` 字段，`branch_to_condition` 据此不写 `logicOperator`。
- **缺 `conditions`**：编辑期间表单可能瞬态产出「有 logic 但无 compare」的分支，`branch_to_condition` 据此不写 `conditions`。

## Decision

从写入路径两端加固，保证写进 DSL 的 IF/ELIF 条件恒为合法：

- [condition-operator.ts](../../../../web/src/pages/workflow/nodes/condition/condition-operator.ts)：`branch_to_condition` 对 IF/ELIF 分支在 `branch.logic` 缺失时默认写 `logicOperator = AND`（单 compare 时 AND/OR 语义等价，故安全）。
- [condition-settings.tsx](../../../../web/src/pages/workflow/nodes/condition/condition-settings.tsx)：`refresh_branches` 对 IF/ELIF 分支在无 compare（或空数组）时回退为默认 `getIfDefinition` / `getElifBranchDefinition`（各带一条默认 compare），保证 `conditions` 非空。

## Alternatives considered

**始终渲染逻辑 Toggle（即使单 compare）**：让 `logic` 字段保持注册而不丢失；但单条件时 AND/OR 无意义，多一个默认控件。未采用——在转换层默认 AND 更干净。

**放宽后端校验（允许缺 logicOperator 的 IF/ELIF）**：违背 DSL 契约——IF/ELIF 分支本就须携带表达式。未采用。

**只在 `branch_to_condition` 默认 AND、不做 compare 兜底**：无法覆盖「无 compare」的另一入口；两处一并加固。

## Consequences

- IF/ELIF 边恒带非空 `conditions` + `logicOperator`，DSL 始终合法；已被写坏的边在下次编辑条件时自动修复。
- 单 compare 分支默认 `AND`（单条件下与 `OR` 等价）；`condition_to_branch` ↔ `branch_to_condition` round-trip 保持幂等。
- 后端校验规则与 DSL 契约不变（继续大声失败）；`verify-dsl-contract` 不受影响。
