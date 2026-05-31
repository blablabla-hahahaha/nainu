# Agent Note: 修正 master-design 蓝图与代码现状的出入

Status: implemented

## Problem

`docs/master-design.md` 与 `docs/technical-architecture.md` 描述超前于代码现状，违背 [docs/AGENTS.md](../../../../docs/AGENTS.md) 的「只写现状」原则。代码核实结果：NodeType 枚举只有 START / END / CONDITION / DEBUG 四类，节点输入引用是 INTERNAL_REF / CUSTOM / EXTERNAL_REF 三态枚举，前端默认注册只有 start / end 节点；文档声称的 LLM / HTTP / CODE / TRANSFORM / HUMAN 外部节点、IF / SWITCH / LOOP / FOR_EACH 内置节点、断点续跑与 Redis PubSub 消息化流式均不存在，Worker 与 Gateway 模块只有空壳。文档把蓝图当现状写，会把后来的实现者引向「已有 LLM 节点」的错觉，偏离 [vision.md](../../../../docs/vision.md) 定义的阶段一真实起点。

## Decision

`docs/master-design.md` 与 `docs/technical-architecture.md` 已修订为只描述已落地的现状：Master 的 DAG 调度执行、Redis + Caffeine 上下文、四类内置节点、三态字段引用、进程内锁与 Redis 分布式锁、REST API；Gateway 与 Worker 标注为骨架，规划职责指向 [vision.md](../../../../docs/vision.md)。未实现的蓝图（LLM / react 节点、Worker 插件、断点续跑、消息化流式、workflow 间调用）不再作为现状陈述，归属愿景演化路线。`docs/vision.md` 第 8 节同步区分已落地与未落地。

## Alternatives considered

**保留文档作为目标态**：把文档当作愿景蓝图。落选原因：违反「只写现状」，且文档与代码并存会让实现者无法判断哪个是真实现；蓝图应归属 [vision.md](../../../../docs/vision.md) 与路线图。
**反向补齐代码到文档**：把 worker 插件、断点续跑等全部实现出来。落选原因：文档描述的是整套工程，隐式承诺大工程；应先修订文档，再按愿景路线逐阶段实现。
**删除文档**：避免误导。落选原因：丢失 DSL、Redis Key、执行模型等设计意图，这些对后续实现仍有价值。

## Consequences

- master-design.md 与 technical-architecture.md 的每条陈述与当前代码一致，后续实现按愿景路线落一段、同步一段文档。
- 蓝图内容不再在实现文档中作为现状出现；LLM / react 节点等能力从「已存在」回到「路线图项」，实现者以代码为权威。
- 修订后文档链接指向可达，`npm run verify:doc-sync` 与 `npm run verify:all` 全绿。
