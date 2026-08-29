# AGENTS.md — Agent 编码规范（前端）

这些规则补充仓库级约定 [../AGENTS.md#conventions](../AGENTS.md#conventions)。

本文件约束所有 AI Agent 在操作 `web/` 前端目录时必须遵守的工程规则。

## 项目概况

- React 19 · TypeScript 5 · Vite 6 · Ant Design 6 · React Flow
- 包管理器：npm

## 红线（最高优先级）

- 禁止 `eslint-disable-next-line`、`--quiet` 等掩盖手段；warning 必须修代码，不改 `eslint.config.js`
- 同一 `.tsx` 禁止同时导出组件和 hook/context；后者放 `.ts`
- 禁止明文密钥/令牌，统一用环境变量
- 禁止 `console.log`（`warn/error` 酌情保留关键错误）
- 禁止 inline function 传给 memo 子组件
- 禁止滥用 `useMemo / useCallback`（有 re-render 问题才用）
- 禁止 `useEffect` 依赖 `[]` 但读了外部变量
- 禁止同一数据源存多个 state（单一数据源）
- 禁止魔法数 → `const node_padding_x = 32;`
- 禁止 3 层以上 JSX 嵌套（应抽子组件）
- 组件内布尔变量可以 `is_xxx`，Props 不要 `is_xxx`

## 命名规范

| 类别 | 风格 | 示例 |
|---|---|---|
| 目录 | kebab-case | `workflow-nodes` |
| 源文件（组件/Hook/工具/样式） | kebab-case + 语义化 | `workflow-nodes.tsx` / `use-message.ts` / `node-status.ts` / `workflow-nodes.module.css` |
| Barrel | 小写 index | `index.ts` |
| 组件 / 函数 / 变量 / Hook / 类型 / 常量 | snake_case | `workflow_nodes` / `is_loading` / `node_padding_x` / `workflow_props` / `node_status_styles` |

补充：
- 布尔以 `is_ / has_ / can_ / should_` 开头；事件以 `on_` 开头
- 数组 plural 或 `_list` 二选一
- 禁止自造缩写（`url / api / id / ctx / html / csrf` 除外）
- 禁止 1-2 字母单字母变量（循环 `i/j/k`、数学 `x/y/z`、`props/ctx` 除外）

## 目录与文件

```
src/
  components/  pages/  hooks/  services/  utils/  constants/  types/  styles/  config/
  component/   ← 禁止新建
```

- 单文件组件直接放 `components/`；≥2 相关文件才建子目录
- 单文件上限：组件 ≤150 行，工具 ≤250 行，配置 ≤300 行
- 目录 ≥2 导出文件时建 `index.ts` barrel；组件库 `export { default } from './component-name'`

组件文件夹模式：
```
workflow-nodes/
  workflow-nodes.tsx  workflow-nodes.module.css  use-workflow-state.ts  node-status.ts  index.ts
```

## 组件结构

```tsx
// 1. import（按 import 章节分组）
// 2. Props 类型（文件顶部）
interface workflow_props { ... }

// 3. 组件本体
export default function workflow_nodes({ ... }: workflow_props) {
  // 3a. 常量/派生值（Hook 前）
  const node_padding_x = 32;
  // 3b. Hook（顺序见下）
  // 3c. 私有 helper
  const render_node = (...) => ...
  // 3d. return JSX
  return (...);
}

// 4. 其他 named export
export function use_workflow_status() { ... }
```

Hook 顺序（硬约束）：
1. 状态类 `useState / useReducer / useRef / useImmer`
2. 上下文 `useContext`
3. 计算类 `useMemo / useTransition / useDeferredValue`
4. 副作用 `useEffect / useLayoutEffect / useInsertionEffect`
5. 自定义 Hook

绝对禁止：条件/循环中调 Hook；早 return 后还有 Hook。

JSX：
- 属性顺序：`id/data-*` → `className` → Props → 事件 `on_xxx` → `style`
- ≤2 属性一行；≥3 每行一个尾逗号
- 行内条件用 `&&` 或三元；复杂条件先算成变量

## 样式

优先级：**Ant Design Theme Token**（`theme.useToken()`）> **CSS Modules**（`workflow-nodes.module.css`）> inline style（仅运行时动态值）

- 禁止 `styled-components / emotion`
- 禁止全局 `.css` 污染（仅允许 `src/index.css`）
- className：`.workflow-node` / `.workflow-node.is-disabled` / `.workflow-node-header`（CSS Modules hash 已足够，不需要额外 BEM）
- 主题变量统一从 token 取，不要硬编码色值

## import

```tsx
// 1. React 运行时
import { useState, useEffect } from 'react';
// 2. 三方
import { theme } from 'antd';
import { ReactFlow } from '@xyflow/react';
// 3. 内部别名（@/ → src/）
import workflow_nodes from '@/components/workflow-nodes/workflow-nodes';
// 4. 相对路径
import node from './node';
import type { node_props } from './node-status';
// 5. 样式（永远最后）
import './workflow-nodes.module.css';
```

- 禁止三方 deep import（`import { use_xxx } from 'antd/es/xxx'`）
- 跨 3 层以上用 `@/`，不要 `../../..`

## 类型

- 对象结构用 `interface`；联合/元组/条件类型只能用 `type`
- 联合 `|` 加注释或 `as const` 派生字面量；交叉 `&` 用于扩展第三方类型
- 泛型简短单字母即可
- 禁止 `any` → 用 `unknown`；万不得已加 eslint-disable 注释说明
- 禁止 `as xxx` 断言；禁止 `!` 非空断言 → 用可选链或先判空
- Props：`xxx_props` 后缀，不二份同义类型

## 注释

### 多行块注释（唯一合法的多行形式）

```typescript
/**
 * 描述用途、参数、返回值。
 *
 * 每个星号独占一行开头，不可折叠压缩。
 */
```

- 导出的 **type / interface / support 对象 / support 方法** 上方必须有 `/** */`
- 导出的 **函数** 上方必须有 `/** */`（组件内私有 helper 可选）
- 块内每一行都要有 ` * ` 开头

### 单行注释

```typescript
// 这是单行注释
const x = 1;
```

- 仅在 **函数体内** 使用
- **函数外**（模块顶层）严禁使用单行注释
- 函数外的说明性注释必须用 `/** */`

### 禁止

- `/* 压缩块注释 */` —— 一律改为 `/** */`
- 函数外使用 `//` —— 一律改为 `/** */`

## 校验与工具

### 交付前三步校验

所有改动交付前 **必须** 通过：

```bash
npm run lint                    # 目视输出，0 error + 0 warning
npx tsc -b --noEmit             # 0 type error
npm run build                   # 完整构建跑通
```

修改前先读上下文：目标文件 + 相关引用；修改后必跑三步校验。

### 工具速查

| 工具       | 配置                   | 命令                              |
| ---------- | ---------------------- | --------------------------------- |
| ESLint     | `eslint.config.js` v9 Flat | `npm run lint`（即 `eslint .`） |
| TypeScript | `tsconfig*.json`，TS 5.8   | `npx tsc -b --noEmit`            |
| 完整构建   | tsc + vite 打包            | `npm run build`                  |

忽略目录：`dist/`

### ESLint 规则集

```
@eslint/js/recommended
typescript-eslint/recommended
eslint-plugin-react-hooks (recommended)
eslint-plugin-react-refresh: only-export-components: warn（allowConstantExport: true）
```

常见阻断项：Hook 依赖数组错误、显式 `any`、未使用的 import/变量、空 interface、JSX 写进 `.ts`、遗留 `console.log`。

```bash
npm run lint                                      # 全量
npx eslint src/pages/.../BranchOperatorForm.tsx    # 定向
npx eslint . --fix                                # 自动修复（先看 diff）
```

### TypeScript 关注点

props / 事件类型、`Promise<T|undefined>` 判空、`Object.keys` 返回 `string[]`、`T|null` 未判空、`!` 非空断言滥用。

### Fast Refresh 违规修法

同一 `.tsx` 既要 `export default function` 又要 `export const hook/Context` → 违规。

**修法**：hook/context 拆到独立 `.ts`（`.ts` 不走 Fast Refresh）。组件 `.tsx` 只留 `export default` + `export type XXX`（`type` 被 `allowConstantExport: true` 豁免）。

**错误修法（拒绝）**：`// eslint-disable-next-line` 堵嘴、改规则级别。

### 补充约束

- 必须**目视 `npm run lint` 输出**，不能只看 exit code。ESLint 只有 error 才非 0 退出，warning 再多也 exit 0。要求：`✖ 0 problems (0 errors, 0 warnings)`
- IDEA / VS Code 黄色波浪线 = 用户可见噪音，必须清零

### 排查清单

- [ ] 无遗留 `console.log`、注释掉的死代码
- [ ] 新增文件：`.tsx` 只 export 组件 + type；hook/context/工具函数放 `.ts`

## 特殊子系统

`src/components/workflow/` 子系统（受控三切片 + 回放器）详见 [docs/design/workflow/workflow.md](./docs/design/workflow/workflow.md)
