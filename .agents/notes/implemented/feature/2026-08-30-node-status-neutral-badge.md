# Agent Note: 节点运行状态改为中性背景 + 状态色边框/图标

Status: implemented

## Problem

运行工作流后，节点外壳会按 `node_status`（wait / runnable / failed / success / suspended…）整体换背景色（`backgroundColor = status_style.color.background`，如成功绿、失败红、执行中蓝），画布被染色得很「花花绿绿」，视觉噪音大。行业通用做法是节点外壳保持中性：背景不随状态变化，用状态色的边框 + 一个小的状态图标区分。

## Decision

- **节点外壳恒用默认样式**：`build_node_style`（`components/node-types.ts`）改为 `(base, borderColor)`，恒取 `by_type['default']` 的背景/阴影；**边框宽度/样式恒定**（1px solid），只改边框颜色。
- **边框颜色随状态**：`components/node.tsx` 在真实状态非 `default` 时，把节点边框着成状态色（`status_style.color.border`）；无状态（`default`）时维持原有逻辑（非选中透明 / 选中的边框高亮）。因边框常驻 1px，加/换边框颜色**不改变节点尺寸**，无抖动。
- **状态只显示图标**：状态图标（`status_style.icon`，如 `SyncOutlined spin`、`CheckCircleFilled`）以 `node-status-icon` 渲染在标题行右侧，**与节点名称水平对齐**（`.node-header` 为 `align-items: center`）；去掉 pill 背景、文案标签与阴影。图标色取 `status_style.color.primary`。
- **待执行（wait）视为中性**：`status_type === 'wait'` 与 `default` 同视为「未启动」，不显示状态图标、边框不着状态色——避免「待执行」的琥珀色边框被误读成告警；只有真正进入执行/终态（runnable / success / failed / suspended / paused）才着色。
- **运行结果卡片**：`components/node-result.tsx` 为已成功节点（`data.status.output` 存在）在节点下方渲染可折叠卡片，`position: absolute; top: 100%`、宽度对齐节点、底色不透明。
  - 节点标题行右侧状态改为 `node-status-pill`（状态图标 + 耗时 `duration ms`）。
  - 折叠态为「展开结果/收起结果」扁平按钮；展开面板为「标题（`节点名 运行结果`）+ 输入/输出只读 code 编辑器（`MonacoBody`：行号/JSON 语法高亮、`vs-dark`、可框选 Ctrl+C）」+ tokens/耗时段脚（tokens 暂为占位 0）。
  - 卡片 `onClick`/`onMouseDown`/`onPointerDown` 均 `stopPropagation`，避免误触发节点拖拽/选中。
- **调试节点输出语义（#1）**：`DebugExecutor` 改为优先用节点配置 `jsonTemplate` 作为输出（模板即输出结构），使「设模板 result:"" 就输出 result」符合直觉；无有效模板时输出空对象（不再产生演示数据）。demo 图的 DEBUG 节点 `config` 自带 `jsonTemplate`（`{"result_username":"张三0","result_age":10}`），保证 demo 自洽、条件分支引用可达。输出字段 `output_field_support.reconcile_outputs` 让设置面板的输出字段与模板顶层 key 对齐（剔除陈旧、补缺、保留已设别名）。
- CSS：`status.module.css` 新增 `.node-status-icon`、`.node-result-*`；给 `.node-name` 加 `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`；删除不再使用的 `.status-icon` 与初版 `status-badge`，并移除被取代的死代码 `node-expanded.tsx` 及其 `.node-expanded-*` 样式。
- 未运行（`EMPTY_RUNTIME`，`data.status` 为 undefined → `default`）时无状态图标、边框透明，节点保持启动前样式；运行后各状态以「状态色边框 + 对应图标」区分。

## Alternatives considered

**整块换色只保留图标（去掉花底）：** 保留「背景按状态染色」逻辑，只是换成更淡的颜色。仍会随状态变化整块背景抖色，噪音没消除；未采纳。

**状态文本标签（pill，图标 + 文案 + 底色）【首版】：** 信息更明确但视觉偏重，用户反馈「有点丑」，且浮在右上角不与名称对齐；改为仅图标、内联与名称对齐。

**右上角漂浮角标：** 与参考图角标审美一致，但用户要求图标与节点名称水平对齐，且漂浮角标易与相邻节点重叠；改置于标题行内联右侧。

**复用 Ant Design `Tag`：** 样式偏重、需额外 token 映射，且与「仅图标、轻量」的诉求不符；未采用。

## Consequences

- 节点背景不随运行状态变化，画布在运行中保持与未启动时一致的中性观感。
- 运行状态由「状态色边框 + 标题行右侧的状态图标」区分；待执行与未启动同视为中性，不显示状态图标、边框不着色。
- 已成功节点在下方展示可展开的运行结果卡片（折叠为扁平状态栏、展开为 title/desc/input/output，input/output 只读可框选）。
- 节点边框常驻 1px，仅换颜色，故有/无状态时节点尺寸一致、无抖动；结果卡片绝对定位，也不改变节点尺寸。
- 调试节点输出跟随 `jsonTemplate`，输出字段与模板顶层 key 自动对齐，面板与运行结果一致。
- 节点名称加省略截断，带状态图标时不撑破标题行。
- 退出节点状态信息不依赖整块染色，后续若要区分「未执行/执行中/终态」仍可借此边框+图标体系扩展。
