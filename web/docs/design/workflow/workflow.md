# Workflow — 可视化工作流编排

基于 [@xyflow/react](https://reactflow.dev/) + Ant Design 的可视化工作流画布组件。核心思想是 **注册表驱动的完全解耦**。

- 源码目录：`src/components/workflow/`
- 入口组件：[workflow.tsx](../../../src/components/workflow/workflow.tsx)
- 注册表工厂：[nodes/index.tsx](../../../src/components/workflow/nodes/index.tsx)

## Quick Start

### 最简用法（只用默认的「开始」和「结束」节点）

```tsx
import Workflow, { defaultRegistry } from "@/components/workflow";
import type { Node, Edge } from "@xyflow/react";

const nodes: Node[] = [
    { id: 'start', type: 'start', position: { x: 400, y: 50 }, data: { label: '开始' } },
    { id: 'end',   type: 'end',   position: { x: 400, y: 350 }, data: { label: '结束' } },
];
const edges: Edge[] = [{ id: 'e1', source: 'start', target: 'end' }];

export default function App() {
    return (
        <div style={{ height: '100vh', width: '100%' }}>
            <Workflow registry={defaultRegistry} initialNodes={nodes} initialEdges={edges} />
        </div>
    );
}
```

### 自定义节点（注册表扩展）

```tsx
import { createRegistry, defaultRegistry } from "@/components/workflow/nodes";
import { HomeOutlined } from "@ant-design/icons";
import MyNode from "./MyNode";            // 节点组件
import MyPanel from "./MyNodeSetting";    // 配置面板（可选）

const registry = createRegistry([
    ...defaultRegistry.entries,
    {
        type: 'agent',
        label: 'AI 代理',
        icon: <HomeOutlined />,
        node: MyNode,
        nodeSetting: MyPanel,  // 不传则该节点点进去没有配置面板
    },
]);
```

## 架构思想

### 注册表驱动，而非继承

不需要 extends 某个基类。只需要在 `createRegistry()` 里声明 type → 组件的映射关系。Workflow 主组件对节点类型零硬编码：它只信任 registry 提供的 `nodeTypes` / `nodeSettingTypes` / `menuItems` 三张表。

好处：
- 运行时可以动态增删节点类型
- 业务节点和画布零耦合
- 类型安全由 TS 保证（registry 内部统一包装成 Node 基础组件）

### 三层职责分离

```
┌─────────────────────────────────────────────┐
│  Workflow.tsx（画布 + 事件路由）            │  ← 主组件层
│  ReactFlow + Background + Controls + 辅助线 │
├─────────────────────────────────────────────┤
│  Node / Edge / NodeSetting / Handle         │  ← 基础组件层（component/）
│  与业务无关的通用视觉与交互                  │
├─────────────────────────────────────────────┤
│  createRegistry / Start / End               │  ← 节点实现层（nodes/）
│  注册表工厂 + 默认节点 + 业务扩展点          │
└─────────────────────────────────────────────┘
```

- 主组件层只管把 ReactFlow 画布、缩放控件、辅助线、配置面板 provider 拼起来，不关心有哪些节点类型。
- 基础组件层只关心"一个节点长什么样"、"一条边怎么画"、"Handle 被点了弹个什么菜单"。
- 节点实现层只关心注册表映射，不参与画布逻辑。

### 状态数据与视觉配置分离

外部（业务/执行引擎）只需要传一个 `NodeStatus` 数据：

```ts
interface NodeStatus {
    type: NodeStatusType;  // 'success' | 'runnable' | ...
    message?: string;
    duration?: number;
}
```

内部 `styles.tsx` 维护一张 `NODE_STATUS_STYLES` 表，把每个 type 映射到具体颜色/边框/图标。改视觉不用改业务数据结构。

### RightHandle 内嵌 NodeMenu 的交互范式

右侧 Handle 里藏了一个加号图标，点击弹出 NodeMenu（搜 + 选节点 + 自动连边 + 计算最优位置）。这意味着"从节点 A 连到节点 B"只需要两步：点右 Handle → 选类型。不需要先拖节点再拖连线。

### 辅助线 + 吸附

`onNodesChange` 里检测 y 坐标差值 < 6px 就吸附并画一条水平辅助线，x 同理。拖拽结束清除。阈值写死在 workflow.tsx。

## 状态速查

| type       | 含义       | 主色   | 图标                 |
| ---------- | ---------- | ------ | -------------------- |
| `default`  | 默认       | 灰     | 无                   |
| `wait`     | 待执行     | 黄     | ClockCircleOutlined  |
| `runnable` | 执行中     | 蓝（脉冲） | SyncOutlined（spin）|
| `suspended`| 已挂起     | 紫     | PauseCircleOutlined  |
| `success`  | 成功       | 绿     | CheckCircleFilled    |
| `failed`   | 失败       | 红     | CloseCircleFilled    |
| `paused`   | 用户暂停   | 灰     | PauseCircleOutlined  |

用法（在节点 data 里塞 status 字段即可）：

```ts
const nodes: Node[] = [{
    id: 'agent1', type: 'agent', position: { x: 400, y: 180 },
    data: { label: 'AI 分析', status: { type: 'runnable' } },
}];
```

动态更新：

```tsx
import { useReactFlow } from '@xyflow/react';
const { updateNodeData } = useReactFlow();

updateNodeData('agent1', { status: { type: 'success', duration: 1234 } });
```

## 自定义节点（3 步）

### Step 1 — 写节点组件（基于 Node 基础组件）

```tsx
import { Position } from '@xyflow/react';
import Node from "@/components/workflow/component/node";
import LeftHandle  from "@/components/workflow/component/left-handle";
import RightHandle from "@/components/workflow/component/right-handle";
import type { node_props } from "@/components/workflow/component/node";

export default function Agent(props: node_props) {
    return (
        <Node {...props}>
            <LeftHandle  type="target" position={Position.Left} />
            <RightHandle type="source" position={Position.Right} menuItems={props.menuItems} nodeId={props.id} />
        </Node>
    );
}
```

- Start 节点：只放 RightHandle（见 [nodes/start.tsx](../../../src/components/workflow/nodes/start.tsx)）
- End 节点：只放 LeftHandle（见 [nodes/end.tsx](../../../src/components/workflow/nodes/end.tsx)）
- 处理节点：两个都放

### Step 2 — 写配置面板（可选）

```tsx
import { Form, Input } from 'antd';
import type { node_setting_props } from "@/components/workflow/component/node-setting";

export default function AgentSetting({ node, updateNodeData, onClose }: node_setting_props) {
    return (
        <Form
            layout="vertical"
            initialValues={node.data}
            onValuesChange={(_, all) => updateNodeData(node.id, all)}
        >
            <Form.Item label="提示词" name="prompt">
                <Input.TextArea rows={4} />
            </Form.Item>
        </Form>
    );
}
```

node_setting_props 完整字段：`node · updateNodeData · onClose · onValidate · children`。不传 nodeSetting 也行，点节点不会报错，只是没面板。

### Step 3 — 注册

```tsx
import { createRegistry, defaultRegistry } from "@/components/workflow/nodes";

const registry = createRegistry([
    ...defaultRegistry.entries,
    { type: 'agent', label: 'AI', icon: <HomeOutlined />, node: Agent, nodeSetting: AgentSetting },
]);

<Workflow registry={registry} initialNodes={...} initialEdges={...} />
```

## 目录结构

```
src/components/workflow/
├── workflow.tsx                    主组件（ReactFlow + 事件路由 + 辅助线）
├── nodes/
│   ├── index.tsx                   createRegistry / defaultRegistry（导出入口）
│   ├── start.tsx                   开始节点（只有 RightHandle）
│   └── end.tsx                     结束节点（只有 LeftHandle）
└── component/
    ├── node.tsx                    基础节点（节点视觉外壳，状态渲染）
    ├── node-expanded.tsx           节点展开详情面板（输入/输出/message）
    ├── edge.tsx                    自定义连线（贝塞尔）
    ├── node-setting.tsx            配置面板 Provider + 通用包装器
    ├── controls.tsx                画布缩放控件 + MiniMap
    ├── guide-line.tsx              吸附辅助线（SVG overlay）
    ├── left-handle.tsx             左侧 Handle（输入目标点）
    ├── right-handle.tsx            右侧 Handle（源点，带 NodeMenu）
    ├── node-menu.tsx               Handle 点击弹出的节点选择菜单
    └── status/                     状态系统（types.ts + styles.tsx + styles.css）
```

路径别名使用 `@/components/workflow`。
