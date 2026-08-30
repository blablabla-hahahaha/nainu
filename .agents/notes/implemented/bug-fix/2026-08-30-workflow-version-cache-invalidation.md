# Agent Note: 编辑器未递增 DSL 版本导致后端编译缓存复用旧图

Status: implemented

## Problem

在工作流编辑器里修改节点（如把「指定输出」的 jsonTemplate 改为 `{"result":""}`、输出字段改为 `result`）后，重新运行仍输出旧的 `result_username/result_age`——与面板显示、用户改动都不一致。抓取实际 `POST /api/workflow/execute` 请求体可见：`debug` 节点的 `config` **没有 `jsonTemplate`**、`output` 仍是旧的 `result_username/result_age`。

两层根因：
1. **面板显示值未写回 canonical 图**：输出节点 Settings 面板的 `initialValues`（默认 jsonTemplate + 与模板对齐的输出字段，来自 `build_initial_output_settings`）只是表单初始值；用户「看到」的值在 `onValuesChange` 不触发时并不会落到 `state.graph`。于是运行发送的 `state.graph` 里节点配置还是旧值（无 jsonTemplate、旧 output）。
2. **后端按 (workflowId, version) 缓存编译**：后端 `StateGraphCompiler.compile` 用 `CompileKey(dsl.getId(), dsl.getVersion())` 做 Caffeine 缓存，命中即返回首次编译的 `CompiledGraph`；注释明确「DSL 变更需递增 version 使缓存失效」。而编辑器发的 id 固定 `editor-demo`、version 从不递增，故每次运行恒命中首次编译的旧图（旧 config + 旧执行行为全被固化）。

## Decision

- **面板值持久化（写回图）**：`OutputSettings` 用 `Form.useWatch([], form)` 监听整份表单，`useEffect` 在**任何字段变化**（含 Monaco 编辑器经 `form.setFieldValue` 修改 jsonTemplate、输出字段经 `onChange` 修改——`setFieldValue` 不触发 `onValuesChange`，故不能依赖 onValuesChange）时，把「表单值」与节点当前配置比对，不同则 `dispatch(graph/update_node)` 写回 canonical 图（保留其它 config 字段）。模板变化时先让输出字段与模板顶层 key 对齐（`reconcile_outputs`，剔除陈旧、补缺、保留已设别名），再由 reducer 递增 version。避免「面板显示值与实际发送 DSL 不一致」。
- **reducer 递增图版本**：`graph/reducer.ts` 新增 `bump_graph_version`，在所有图结构变更动作（`graph/add_node` / `remove_node` / `update_node` / `connect_edge` / `remove_edge` / `update_edge` / `set_condition_edges`）返回的 graph 上 `version = (version ?? 0) + 1`；`view/*` 与 `runtime/*` 不动 version（视图/运行态不改变 DSL 内容，不应刷新编译缓存）。
- **初始版本**：`workflow-page.tsx` 的 `init_workflow_state` 给图设 `version: 1`，保证首次编译有确定版本；后续每次编辑都递增。
- **demo 自带 jsonTemplate / DebugExecutor 空输出**：demo 图 DEBUG 节点 `config` 自带 `jsonTemplate`（`{"result_username":"张三0","result_age":10}`），使 demo 自洽；`DebugExecutor` 无有效模板时输出空对象（不再写死演示数据）。

## Alternatives considered

**后端改为按 DSL 内容（哈希）做缓存 key**：更鲁棒，但每次编译前要算哈希、改动核心编译逻辑，且违背既有「按版本失效」契约；未采纳，改为让调用方（编辑器）遵守契约。

**后端在编辑器运行态禁用缓存 / 每次强制重编译**：抑制性能收益，且与「资产可缓存」的设计相悖；未采纳。

## Consequences

- 打开输出节点 Settings 面板即把默认/对齐后的 jsonTemplate 与输出字段写回图，运行结果与面板一致。
- 编辑器每次 DSL 变更后运行，后端都会用最新内容重编译；同一版本重复运行仍命中缓存，兼顾正确与性能。
- 视图操作（拖拽/平移）与回放事件不再误触发重编译（version 不变）。
- 代价：打开面板会触发一次 `graph/update_node`（写回 + version+1）；因编辑器为内存态、version 不作乐观锁，无副作用。
