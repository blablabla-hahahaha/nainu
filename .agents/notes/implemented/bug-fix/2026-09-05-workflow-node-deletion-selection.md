# Agent Note: 修复工作流节点无法删除（React Flow 受控选择态未落节点）

Status: implemented

## Problem

工作流画布上无法删除节点：选中任意节点后按 `Delete`/`Backspace` 无任何反应。删除是 React Flow 的内置行为（选中节点 → 按删除键），此前在本仓库从未真正生效——自工作流编辑器引入起即如此，属静默缺陷而非近期回归。

## Decision

- [graph/types.ts](../../../../web/src/components/workflow/graph/types.ts)：`workflow_view` 增加可选字段 `selectedNodeIds: string[]`，作为受控选择态（纯 UI 状态，不入 canonical 图）。
- [graph/reducer.ts](../../../../web/src/components/workflow/graph/reducer.ts)：新增 `view/select_nodes` 动作（写入选择集，内容相同时返回原 state）；`graph/remove_node` 同时从选择集剔除被删节点。
- [graph/react-flow-mapping.ts](../../../../web/src/components/workflow/graph/react-flow-mapping.ts)：`build_rf_node` 增加 `selected` 参数并在投影节点上写入；`project_stable` 从 `view.selectedNodeIds` 派生 `selected`，并把 `selected` 纳入投影缓存指纹（选择变化时重新生成节点对象）。
- [components/use-workflow-changes.ts](../../../../web/src/components/workflow/components/use-workflow-changes.ts)：在 `onNodesChange` 内处理 `select` 变更，用 ref 累积选中节点集，派发 `view/select_nodes`；`remove` 变更同步从选择集剔除。
- [components/node-setting.tsx](../../../../web/src/components/workflow/components/node-setting.tsx)：节点设置卡片头部增加「删除节点」按钮，直接派发 `graph/remove_node` 并关闭面板。作为不依赖焦点归属的兜底入口。
- [monaco-code-editor.tsx](../../../../web/src/components/monaco-code-editor/monaco-code-editor.tsx)：`handle_on_mount` 去掉 `editor.focus()`。设置面板常驻 Monaco，挂载即抢焦点使删除键失效；不再抢焦点后，键盘删除对指定输出/编码脚本节点恢复正常（编辑器内点击仍会聚焦，不影响输入）。

## 根因

React Flow 的删除热键在其 `useGlobalKeyHandler` 中这样取待删目标：

```
deleteElements({ nodes: nodes.filter(selected), edges: edges.filter(selected) })
```

它过滤的是**受控 `nodes` prop 数组**上的 `selected` 字段（`selected = (item) => item.selected`）。在受控模式下，选择只经 `onNodesChange` 派发 `select` 变更；本应用此前只处理 `remove` 与 `position` 变更、完全忽略 `select`，于是受控节点上永远不带 `selected`，`nodes.filter(selected)` 恒为空，删除热键找不到任何目标；节点选中边框（`node.tsx` 依赖 `selected`）同样从来不出。

初期方案曾依赖 React Flow 的 `onSelectionChange` 回调同步选择集——但这在受控模式下不触发：选中只改变内部 `nodeLookup` 元数据，既不调用 store `set`/`setNodes`（`hasDefaultNodes=false`），也不引起任何订阅更新，`useOnSelectionChange` 的 selector 不会重算。可靠路径是 `onNodesChange`——受控契约下 React Flow 每次交互都经它派发变更，`select` 变更必然送达。

### 根因·指定输出/编码脚本删不掉

恢复选择态后，键盘删除在「指定输出」（DEBUG）/「编码脚本」（SCRIPT）节点上仍失效：它们的设置面板内嵌 Monaco 编辑器，`handle_on_mount` 里显式 `editor.focus()` 会在面板打开瞬间把焦点从画布抢到编辑器（`native-edit-context` 表面）。此后按 `Delete`/`Backspace` 落入编辑器而非画布，删除热键取不到目标。条件/结束节点均无此常驻 Monaco 面板，不抢焦点，故键盘删除正常。

结论：把焦点留在画布（去掉 `editor.focus()`）才是根治；删除按钮则作为不依赖焦点归属的兜底入口。

## Alternatives considered

**依赖 `onSelectionChange` 回调**：能一次性拿到选中集，但受控模式下选中态只改内部 `nodeLookup`、不触发 store 订阅，该回调不触发（从 `triggerNodeChanges`/`useOnSelectionChange` 源码路径确认），未采用。

**禁用 React Flow 删除热键（`deleteKeyCode={null}`）并自实现删除键监听**：可绕过 `nodes.filter(selected)`，但要自己处理 `Backspace` 与文本输入焦点的冲突、自行维护被选节点，且选中节点的高亮边框仍然缺失，未采用。

## Consequences

- 选中节点后按 `Delete`/`Backspace` 可删除该节点及其连边；`START` 仍不可删（`use-workflow-changes` 的 `is_start` 过滤保留）。
- 节点设置卡片新增「删除节点」按钮，作为不受 Monaco 焦点影响的确定性删除入口（仅对带设置面板的节点渲染；`START` 无设置面板不渲染）。
- 点击节点会显示选中边框（此前选中态也不落节点，点击无高亮），点击空白画布会取消选中。
- `selectedNodeIds` 为纯视图状态，随 `graph.meta.view` 持久化，可丢弃；不进入 DSL canonical 图，不影响运行与回放。
- 边（edge）的选中态未纳入本次修复（`selectedNodeIds` 只记节点），按删除键删除边的能力仍受同一根因影响，留作后续对齐。
