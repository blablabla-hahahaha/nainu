# 包 README 模板（package-reference kind）

> 本模板对应 `kind: "package-reference"`（一个 Cordis 插件或服务包）。其余 kind：`package-group` / `package-library` / `package-bundle`。
> 参考范例：`session-persistence-sqlite` 的 README 对。

```markdown
---
description: "What the package lets a reader choose, configure, or debug, in one or two concrete sentences with searchable domain terms."
kind: "package-reference"
---

# @scope/package-name

English | [中文](README.zh.md)

## Summary

<三到五句：用户或智能体能用它做什么——结果、何时选、主要成本、最重要边界。绝不说角色/类型/内部身份。>

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

<一句定位句：公共路径。>

### <挂载 / 配置 / 用法>

<配置表 + 折叠的实现细节。>

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<开发者章节：整体设计概念、架构、示意数据流——「解释而非枚举」。链接代码给精确细节。>

-----

<a id="further-exploration"></a>
## Further Exploration

<3–7 个相邻页面的链接。>

-----

<a id="model-experience"></a>
## Model Experience

<模型、token、KV-cache 效应的规范格式。>

-----

<a id="known-limitations-and-deferred-work"></a>
## Known Limitations and Deferred Work

<持久消费缺口 + 非显而易见的维护者约束。>

-----

<a id="dev-note"></a>
## Dev Note

<唯一 slop 区：部分想法、草稿、未定方向、工作假设。明示非权威。>
```

**语态规则**（来自 dsh-doc）：
- Summary 说「能让你做什么」，不说「是什么」；
- 开发者章节「解释而非枚举」，无完整 API 目录 / 穷尽列清单 / JSDoc 复述；
- Dev Note 是唯一 slop 区，其余都是打磨过的现状散文；
- 只写现状（无 "previously/now/no longer/renamed"）。

**命名规则**（「命名存在的角色」）：命名稳定**当前**职责，不命名首个实现 / 可能的未来扩展 / Cordis 基类。接口包命名能力；实现包加机制/协议/环境/厂商。`Controller`（接受命令改状态）/ `Store`（拥有一份数据做 CRUD）/ `Directory`（暴露条目供发现）/ `Presenter`（纯转换）/ `Registry`（拥有命名注册集合）/ `Runtime`（跑实时工作）/ `Resolver`（算一个答案）/ `Binder`（绑定已声明接口）。
