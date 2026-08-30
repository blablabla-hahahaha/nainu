# Agent Note: 工作流画布拖拽闪烁与卡顿修复（稳定投影 + measured 续持）

Status: implemented

## Problem

工作流编辑器（`web/src/components/workflow/workflow.tsx` + [react-flow-mapping.ts](../../../../web/src/components/workflow/graph/react-flow-mapping.ts)）在拖拽节点时整屏闪烁（节点在显示/隐藏间跳动）且明显卡顿。根因不是 React Flow 配置错误，而是受控投影把「每次渲染都生成全新节点对象」当作正确实现。

`Workflow` 用 `useMemo(() => from_canonical(state.graph, state.view, state.runtime), [...])` 每次渲染都重建**所有** Node/Edge 对象（含 `data` 新对象）。React Flow 的 `StoreUpdater` 在 `nodes` prop 引用变化时调 `setNodes`，内部 `adoptUserNodes(... checkEquality: true)` 的快速路径依赖 `userNode === internalNode.internals.userNode`（对象引用相等）。引用不等 → 对**每个**节点重建内部节点，并把 `measured` 重置为 `undefined`。节点外壳以 `visibility: hasDimensions ? 'visible' : 'hidden'`（`nodeHasDimensions` 依赖 `measured`）控制显隐，于是每次渲染所有节点先隐藏再被 ResizeObserver 重测成显示——拖拽每帧一次，即「屏闪」。同时每个节点每帧重建 + 重测 + 重渲染，产生卡顿。

## Decision

画布把投影改为**引用稳定的** [project_stable](../../../../web/src/components/workflow/graph/react-flow-mapping.ts)（`from_canonical` 保留，供 round-trip 门禁）：按节点 id 缓存投影对象，仅当 canonical 引用 / 位置 / 状态变化时才重建，否则复用缓存对象，命中 `adoptUserNodes` 快速路径 → 未变化节点不再重测 / 隐藏。

为让**被拖拽**的节点（每帧位置变化必然重建、复走重测）也不闪，投影经 React Flow store 读取已测尺寸：把 `node_lookup`（`Map<id, internalNode>`）传入 `project_stable`，重建节点时携带其 `measured`（`build_rf_node` 落到 `node.measured`），使 `adoptUserNodes` 重建成 `hasDimensions === true`，节点不再隐藏。

实现上把投影 + ReactFlow 画布拆到 [workflow-canvas.tsx](../../../../web/src/components/workflow/components/workflow-canvas.tsx)（位于 `ReactFlowProvider` 内，方能 `useStore` 读 `nodeLookup`），[workflow.tsx](../../../../web/src/components/workflow/workflow.tsx) 仅保留 provider + 状态上下文。同时把 `onNodesChange` / `onEdgesChange` 稳定化：[use-snap-guide.ts](../../../../web/src/components/workflow/components/use-snap-guide.ts) 与 [use-workflow-changes.ts](../../../../web/src/components/workflow/components/use-workflow-changes.ts) 用 `nodes` ref 读最新节点快照，去掉回调对 `nodes` 数组的依赖（其引用每帧变化会反复触发 `StoreUpdater` 重跑）。

## Alternatives considered

**carry `width`/`height`/`initialWidth` 固定值兜底**：在投影节点上写死 CSS 宽高（节点壳宽 235px），使 `hasDimensions` 恒真。简单，但高度随内容/状态变化，写死值会在 1 帧内错位 handle；且引入魔法数、违背「禁止魔法数」，未采用。

**拖拽期间不回流位置，仅拖拽结束时 `view/move_node`**：避免每帧重投影。但节点位置在受控模式下必须回流才跟手，且会牺牲拖拽过程中的吸附参考线（`apply_snap_to_change` 依赖中间位置），削弱现有对齐体验；仅在极端图规模才值得，未采用。

**保持注入式 `useMemo` 不变、在 `Workflow` 内 `useStore`**：`Workflow` 渲染 `ReactFlowProvider` 于自身 JSX 内，不是其祖先，无法调用 `useStore`；必须把投影下沉到 provider 内的子组件，故拆出 `WorkflowCanvas`。

## Consequences

- 未变化节点在每次渲染命中 `adoptUserNodes` 快速路径，`measured` 不被重置，不再显示→隐藏→重测；拖拽仅重建并重渲染被拖节点。
- 被拖节点因携带 `measured` 不隐藏；重测仍由 ResizeObserver 在尺寸真正变化时触发，不会出现尺寸陈旧。
- `onNodesChange` / `onEdgesChange` 引用在渲染间稳定，`StoreUpdater` 不再每帧重跑，减少拖拽期间 store 更新与订阅抖动。
- `from_canonical` 与 round-trip（`verify-dsl-contract`）语义不变，`project_stable` 为新增纯函数，门禁用例仍通过。
- 代价：`Workflow` 拆出 `WorkflowCanvas`，投影逻辑从页面组件下沉一层；`project_stable` 额外接收 `node_lookup`，耦合到 React Flow 内部节点类型（以结构化类型收窄）。
- `WorkflowCanvas` 里 `@xyflow/react/dist/style.css` 的引入需位于组件导入之前，否则 React Flow 基础 `.react-flow__handle`（暗色默认背景 `#1a192b`）会按加载顺序覆盖自定义 `.handle-host`，连接点渲染成黑点。为顺序无关，`status.module.css` 的 `.handle-host` 提权为 `.react-flow__handle.handle-host`（特异性 0,2,0）。
