# Agent Note: 运行结果卡片交互与布局优化（点击置顶 / 加宽 / 小字号 / 禁拖拽）

Status: implemented

## Problem

运行结果卡片（`components/workflow/components/node-result.tsx`）在画布上的展示与交互有三处体验缺口：

1. **被相邻节点压住**：结果卡片是节点的绝对定位子元素（`node-result`，`top: 100%`），其层叠被宿主节点（`.react-flow__node` 具有非 auto zIndex，形成 stacking context）约束。分支一、分支二这类并排节点的结果卡片会互相重叠，且图中后声明的节点（分支二）恒在（分支一）之上，用户无法把想看的某条结果带到最上层。
2. **宽度不足**：卡片 `width: 100%` 对齐节点（235px），JSON/代码内容被横向压缩，长内容展示不全。
3. **拖拽干扰复制**：结果卡片默认继承节点的可拖拽性，拖动/框选卡片内文本会误触发节点拖拽，无法顺畅复制内容。

## Decision

- **点击节点置顶其运行结果**：引入「被点击置顶节点」概念。画布（`components/workflow/components/workflow-canvas.tsx`）持 `top_node_id` 状态，`onNodeClick` 与结果卡片展开/收起时把宿主节点 id 置为 `top_node_id`；投影层（`graph/react-flow-mapping.ts`）对 `top_node_id` 节点写入 `zIndex`（`TOP_RESULT_Z = 2000`，高于 React Flow 选中节点抬高量 `SELECTED_NODE_Z=1000`），使其节点及其结果卡片盖过其它节点（含选中/拖拽中节点）。投影缓存把 `zIndex` 纳入指纹比较，仅置顶切换时重建受影响的节点对象。
- **结果卡片加宽**：`status.module.css` 的 `.node-result` 由 `width: 100%` 改为 `width: 150%`（节点宽度的 1.5 倍），给输入/输出编辑器更多横向空间，且随节点宽度自适应。
- **运行结果编辑器小字号**：`monaco-code-editor/monaco-body.tsx` 新增可选 `font_size`（默认 14），`NodeResult` 传 `font_size`（`RESULT_EDITOR_FONT_SIZE = 12`）；设置面板等其它用例如未传则维持默认。
- **结果卡片禁拖拽**：`.node-result` 根元素追加 React Flow 官方 `nodrag` 类（结合既有 `stopPropagation`），使卡片不参与节点拖拽，以便在编辑器内框选并复制文本。

## Alternatives considered

**依赖 React Flow 选中抬高（`elevateNodesOnSelect`）置顶**：点节点体即 `selected` → 节点 z+1000 自然盖过其它；但结果卡片的展开/收起按钮 `stopPropagation`，不会选中节点，且一旦点击画布空白（反选）就回落，用户无法稳定置顶；未采纳，改以显式 `top_node_id` + 投影 `zIndex` 驱动。

**在 `.node-result` 上直接抬高 `z-index`**：卡片 `z-index` 被宿主节点 stacking context 限制，仅抬卡片自身层叠无法盖过相邻节点的 `.react-flow__node`；未采纳，必须抬宿主节点本身。

**结果卡片水平居中布局（`left: 50%` + `translateX(-50%)`）**：可避免单侧溢出，但会把「展开结果」按钮一并带到节点左侧，视觉与节点错位；未采纳，保持左对齐、仅加宽。

**就地设置 vs 全局小字号**：运行记录编辑器单独传 `font_size=12`，避免影响设置面板编辑器；全局缩小字体收益受编辑器自身定位约束，未采用。

## Consequences

- 被点击节点（含其结果卡片）始终位于其它节点之上，直到用户点击另一节点；点击画布空白不再复位置顶。
- 结果卡片宽度为节点宽度的 1.5 倍，配合小字号（12px），长 JSON/代码在面板内可读性显著改善；面板为绝对定位覆盖层，加宽后更易与相邻节点重叠，但由置顶规则保证被点中的那一张在最上层。
- 结果卡片不再触发节点拖拽，可在输入/输出编辑器内自由框选、复制文本。
- 投影缓存将 `zIndex` 纳入指纹，仅置顶切换时重建受影响节点，拖拽闪烁与全画布重渲染风险不新增。
