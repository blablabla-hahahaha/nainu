# Agent Note: 编码节点设置布局统一为「输入-编码-输出」并修复输入字段列错位

Status: implemented

## Problem

编码（SCRIPT）节点设置面板的区块顺序为「脚本代码 → 输入字段 → 资源上限 → 输出字段」，与其它节点（如「指定输出」采用「输入字段 → 输出内容 → 输出字段」）不一致，用户预期中节点编辑顺序应为「输入、编码、输出」。

同时，输入字段行出现列错位：别名 `Input` 与值 `Input/Select` 都为 `flex: 1`，但未设 `min-width: 0`。Flexbox 子项默认 `min-width: auto`，不允许收缩到内容宽度以下；当值列为内部引用时显示较长标签（如「指定输出 → username」），该列被内容顶宽、挤占别名列，致使各行三列宽度不一致、排列「错综复杂」。

## Decision

- [script-settings.tsx](../../../../web/src/pages/workflow/nodes/script/script-settings.tsx)：把「输入字段」区块移到「脚本代码」之前，区块顺序统一为「输入字段 → 脚本代码 → 资源上限 → 输出字段」，与「指定输出」等同节点一致。
- [node-field.tsx](../../../../web/src/components/workflow/extends/node-field/node-field.tsx)：给所有 `flex: 1` 的列（别名输入、值输入/下拉）补 `minWidth: 0`，使其可收缩到弹性份额而不再被内容撑开；给固定宽度的类型选择列加 `flexShrink: 0`，保证其不被压缩；并把魔法数 `100` 提取为常量 `type_select_width`。

`NodeField` 是共享组件，输入字段、输出字段与条件比较运算符行都经 `NodeFieldItem` 复用，因此该对齐修复同时让这些行列宽稳定。

## Alternatives considered

**给每列固定宽度**：列宽完全确定、各行锁定对齐；但值列标签长短不一，固定宽度易截断且需要为不同场景维护多套宽度，未单独采用。

**保持 `flex: 1` 现状、仅在面板本身预留更多宽度**：治标不治本，没有解决 flex 子项默认 `min-width: auto` 导致的「内容顶开列」行为，未采用。

**让值列比别名列更宽（不同 flex-grow）**：可容纳更长标签，但跨行列宽仍不相等、对齐仍不稳定；未采用，改为等份额 + `min-width: 0`。

## Consequences

- 编码节点设置面板区块顺序与其它节点对齐，符合「输入、编码、输出」的编辑心智。
- 输入/输出字段每行三列宽度稳定一致，长标签（内部引用「xx → yy」）在列内截断而不是顶开布局。
- 类型选择列保持 `100px` 固定宽度；未来调整只改 `type_select_width` 一处。
- `NodeField` 的其它消费方（输出字段两列、条件比较运算符行、禁用别名的场景）列宽同样稳定，无行为回归。
