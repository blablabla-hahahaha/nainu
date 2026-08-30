# Agent Note: 节点输入/输出运行时快照语义修正——输入取解析值、输出取别名映射值

Status: implemented

## Problem

在[条件节点输入派生](2026-08-31-condition-node-input-derivation.md)落地后，运行结果卡把「引用映射声明」当成了节点输入展示：（`{"key":"username","type":"INTERNAL_REF","value":"debug:username"}` 而不是实际值 `{"username":"张三0"}`）。同时指定输出（DEBUG）节点的输出卡展示的是执行器原始结果（`{"result_username":"张三0","result_age":10}`），而非按 `node.output` 别名映射后的对外输出（`{"username":"张三0","age":10}`）。用户指出：运行时输入应是解析后的实际值，节点输出应是别名映射后的值。

根因是运行时/展示层把「声明/映射（设计期 DSL 元数据）」与「运行时快照（实际消费/产生的值）」混为一谈：

- 输入：`NodeActionAdapter.resolveInputs()` 已算出解析值并在 `NODE_STARTED` 发射，但前端 reducer 丢弃了 `event.input`，运行结果卡改读声明态 `data.input`。
- 输出：`writeOutputs()` 写回图状态用的是别名键（`node:{id}.{keyAlias}`），但 `NODE_SUCCEEDED` 发射的是执行器**原始 result**，导致 trace 快照与图状态（别名键）不一致。

## Decision

让 trace 运行时快照语义收敛为「节点实际消费/产生的值」：

- 后端 [NodeActionAdapter.java](../../../../nainu-agi-master/src/main/java/nainu/top/agi/master/compile/NodeActionAdapter.java)：`NODE_SUCCEEDED` 的 `output` 由「执行器原始结果」改为「按 `node.output` 声明映射的别名键输出」——新增 `visibleOutput`：仅收录声明在 `node.output` 的字段，`keyAlias` 为空时落回 `key`；键与 `writeOutputs` 写回图状态一致。原始结果里未声明的 key 属于执行细节，不算节点输出。
- 前端 [types.ts](../../../../web/src/components/workflow/graph/types.ts)：`node_runtime_status` 增加 `input`（解析后的输入快照）。
- 前端 [reducer.ts](../../../../web/src/components/workflow/graph/reducer.ts)：`runtime/apply_event` 的 `NODE_STARTED` 保留 `event.input`；`patch_node` 由「整体替换节点状态」改为「合并」，使后续 `NODE_SUCCEEDED`/`NODE_FAILED` 不覆盖掉输入快照；`NODE_STARTED` 同时清空本次运行复算的字段（output/duration/message/error，适配 at-least-once 重跑）。
- 前端 [node.tsx](../../../../web/src/components/workflow/components/node.tsx)：运行结果卡传入 `runtime.input`（解析值），不再传声明映射 `data.input`。

原则：trace 输入快照=解析后值、输出快照=别名映射后值；声明映射（`node.input` / `node.output`）是设计期 DSL 元数据，在设置面板 / 画布展示，不出现在运行时输入/输出快照里。

## Alternatives considered

**前端仅在展示层做别名映射、后端保留原始 output 快照**：保住原始审计信息，但 trace 快照键与图状态（别名键）不一致，映射逻辑分散到前端，未来消费方拿到与图状态不符的「假输出」。未采用。

**在映射信息里增加字段表达真实内容（用户给出的保底方案）**：保留声明+值双份，但运行时快照应纯粹表达实际值，在同一快照里混合声明与值反而引入歧义。未采用。

**延续上轮方案（运行结果卡展示声明映射）**：已被用户明确否决（「把引用映射信息当作输入不对」）。

## Consequences

- `NODE_SUCCEEDED` 的 `output` 语义收敛为「节点对外可见输出（别名键）」，与图状态写入键一致；事件日志与运行结果卡均展示解析输入与映射输出。
- 执行器原始结果不再出现在 trace output——未声明为输出的原始 key 不属于节点输出；如需保留原始结果可经独立字段补回（本次未做）。
- 前端运行结果卡以运行时快照为准，声明映射不再泄漏到运行时展示。
- 依赖[条件节点输入派生](2026-08-31-condition-node-input-derivation.md)：条件节点先有声明 input，后端 `resolveInputs` 才能产出解析值快照，运行结果卡才能展示实际输入值。
