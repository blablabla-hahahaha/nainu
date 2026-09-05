# Agent Note: 修复编码节点代码编辑器无法输入空格（React Flow Space 平移热键拦截）

Status: implemented

## Problem

编码（SCRIPT）节点与「指定输出」节点的代码/模板编辑器（基于 `@monaco-editor/react`）无法输入普通空格：按下空格不插入任何字符，而 `Shift+空格` 能正常插入一个空格；其它按键全部正常。切到英文输入法亦然，其它编辑器无此问题。

## Decision

- [workflow-canvas.tsx](../../../../web/src/components/workflow/components/workflow-canvas.tsx)：给 `<ReactFlow>` 传 `panActivationKeyCode={null}`，关闭 React Flow 默认的「按住 Space 平移」热键。拖拽平移（`panOnDrag` 默认开启）仍可用。

`panActivationKeyCode` 的默认值是 `'Space'`，React Flow 会在 `window` 上注册 `keydown` 监听来感知该热键。关闭后 React Flow 不再拦截空白键，编码编辑器（SCRIPT 脚本 + 指定输出 jsonTemplate）便能正常输入空格。

## 根因

应用经 `@monaco-editor/react` 加载编辑器，而 `@monaco-editor/loader` 默认从 CDN 加载 `monaco-editor@0.55.1`（并非本仓库 node_modules 里的 0.50.0）。Monaco 0.55 的编辑表面改用 `native-edit-context`（`role="textbox"` 的 div）与 `ime-text-area`，其 `isInputDOMNode` 判定不再命中（不是 `INPUT/SELECT/TEXTAREA`，也无 `contenteditable` 属性）。

React Flow 的 `useKeyPress('Space', { target: window })` 处理函数依赖 `isInputDOMNode` 决定是否跳过；由于 Monaco 0.55 的编辑表面未被判为输入节点，普通空格的 `keydown` 被 React Flow `preventDefault()` 提前拦截，空格在进入 Monaco 模型前就被吞掉。`Shift+空格` 带修饰键，React Flow 的判断路径不同，得以放行。

用 Puppeteer + 真实 Chrome 实证：Monaco 0.55 单独创建（同款 options）能正常插入空格；叠加 React Flow 该 Space-平移处理函数后普通空格即失效（模型无变化）；关闭 Space-平移（或给编辑器容器加 `.nokey`）后恢复。

## Alternatives considered

**给 Monaco 容器加 React Flow `.nokey` 类**：仅把编辑器标记为「不参与 React Flow 键盘交互」、保留画布 Space-平移；更针对，但把 React Flow 的类约定耦合进通用 Monaco 组件，未采用。

**把 `monaco-editor` 固定到本地 0.50.0（配置 loader）**：0.50 的 `<textarea>` 表面能被 `isInputDOMNode` 识别；但问题根源是 React Flow 的 Space-平移统一拦截空白键，降版本并不能消除与其它输入/未来组件的同类冲突，未采用。

**给编辑器配置 `contenteditable`/可被识别的输入表面**：依赖 Monaco 内部 DOM 结构，脆弱，未采用。

## Consequences

- SCRIPT 脚本与指定输出 jsonTemplate 编辑器可正常输入普通空格；`Shift+空格` 行为不变。
- 画布失去「按住 Space + 拖拽平移」，但拖拽平移仍可用，影响很小。
- 冲突在 React Flow 层面一次性解决，覆盖检查器里所有 Monaco 编辑器（脚本 + 输出模板）。
