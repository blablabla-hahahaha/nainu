# Agent Note: 以 workflow 图编排作为项目愿景主线

Status: implemented

## Problem

项目此前没有明确的演进方向定义：主流的「模型层 + agent harness 层」路径存在三个结构性缺陷——harness 对使用者是黑盒（prompt、context、agent loop 类型与层数不可选不可见），未提供 agent 之间的智能互联（skill/MCP/CLI 只是单 agent 的具身途径），agent 2 agent 范式的自由文本上下文传递伴随污染与失真。缺少一个能统一回应这三点的方向，代码库（Node Graph 引擎、Worker 插件、Redis 上下文）就只是工具而非路线。

## Decision

[vision.md](../../../../docs/vision.md) 是项目北极星文档，把项目定义为「让智能可读、可测、可进化的编排平台」，以 workflow 为智能的原子单位。核心机制包括：schema 窄通道为第一性原理（节点内 post 校验、节点间 typed edges、workflow 间只传输入 schema 参数，不传上下文）；react 节点为唯一自主点（内部探索与互联共用同一机制，平台只提供深度/信任/schema 约束）；神经元市场为信任机制（人类绑定 → 市场信号 → AI 自主搜索三级演进，机械验证与市场信号双轨）；作者侧编排机器人为演化引擎。演化路线分四阶段：基础闭环 → 验证侧 → 神经元市场 → 运行时治理 + AI 搜索。vision.md 已被 [docs/AGENTS.md](../../../../docs/AGENTS.md) 层级分类法收录为独立层，并在根 [AGENTS.md](../../../../AGENTS.md) 仓库布局登记入口。

## Alternatives considered

**纯 agent harness 路线**：直接拥抱主流两层路径。落选原因：黑盒、无互联、上下文失真三个缺陷都无法在 harness 层内结构性修复，只能缓解。
**纯 workflow 无自主性路线**：图完全固定，不加 react 节点。落选原因：丧失对开放任务的适应性，可读性以表达力为代价。
**宽通道互联**：允许 workflow 间传递部分上下文。落选原因：上下文污染会跨 workflow 传播，违背保真目标；作为高阶课题挂起，当前取窄通道。
**trace → subgraph 编译作为当期机制**：把验证过的 react 轨迹固化为子图。落选原因：依赖验证侧成熟，属于自进化后期形态，现阶段挂起，以人辅 AI 生成 workflow 作为前奏。

## Consequences

- 后续实现决策以 vision.md 为准绳：新节点类型、typed edges、市场机制等按四阶段路线推进，避免与愿景冲突。
- react 节点内部仍是黑盒，自主性与可读性存在张力；缓解方式是把 react 限定在「被验证包围」的位置（post sub-graph 严格校验）。
- 市场信号不等于正确性，声誉可能误导选择；缓解方式是机械验证与市场信号双轨并行。
- 宽通道与 trace→subgraph 编译被挂起，若过早开放会引入未治理的上下文传播；路线图已按依赖顺序排列。
- 代码现状与文档曾存在出入，已由另一份 implemented note（master-design-sync-to-code）处理。
