# Agent Note: 默认工作流节点横向间隔

Status: implemented

## Problem

编辑器默认图（[workflow-page.tsx](../../../../web/src/pages/workflow/workflow-page.tsx) 的 `init_workflow_state`）把主行相邻节点放在 `x` 相差 `200` 的位置，而节点卡片宽度固定为 `235`（[status.module.css](../../../../web/src/components/workflow/components/status.module.css) 的 `.workflow-node { width: 235px }`）。`200 < 235`，相邻卡片互相重叠 `35px`，画布初载即呈现「节点集成一团」的拥挤外观，与用户预期（每个节点留有可见间隔）不符。

## Decision

- **默认节点位置用命名常量表达**：新增 `node_card_width`（`235`，与 `.workflow-node` 宽度一致）、`node_horizontal_gap`（`100`）、`node_column_step = node_card_width + node_horizontal_gap`（`335`）、`node_first_column_x`（`40`）、主行/分支行的 `y` 常量。所有默认列位置由 `node_first_column_x + 列号 * node_column_step` 计算，消除重复字面量。
- **横向净空为 `100`**：相邻卡片间保留 `100px` 可见间距，彻底消除 `35px` 重叠。
- **分支结构保持原状**：`end_1`（`y=120`）、`end_2`（`y=300`）与主行（`y=200`）的相对纵向偏移沿用既有值，条件分支的 IF/ELSE 分支仍上下分布。

## Alternatives considered

**沿用原硬编码 `x` 值，仅把间距改大**：改起来快，但 `x` 直接写成 `40/240/440/…`，与「节点宽 `235`」无关联、重复且易漂移；未采纳，改为从命名常量推导。

**复用 `node-menu.tsx` 的「节点宽 + `50`」间隔**：新节点落位用 `node_width + 50`，与默认图一致性好；但 `50px` 净空偏紧，不足以让主行节点呈现图像所要求的那种疏朗间隔；未采纳，默认图用更宽的 `100px` 净空。

**依赖自动排布（`AUTO_POSITION_STEP_X = 50`）**：`react-flow-mapping.ts` 在无显式位置时按 `50px` 步进落节点，比现状更拥挤；未采纳，仍为默认图显式提供 `view.positions`。

## Consequences

- 默认工作流初载时每个节点卡片之间留 `100px` 净空，主行不再重叠，视觉上呈「每个节点有一定间隔」的清晰布局。
- 列间距集中为 `node_column_step`（`node_card_width + node_horizontal_gap`），未来调整节点宽或间隔只需改一处常量。
- 节点其它行为（分支纵向偏移、`fitView` 自适应全图、拖拽吸附）不受影响。
