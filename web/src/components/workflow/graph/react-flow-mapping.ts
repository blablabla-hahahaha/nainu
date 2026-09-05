/**
 * canonical ↔ ReactFlow 双向投影：ReactFlow 节点/边是视图，canonical 图是唯一事实源。
 * 纯逻辑（三方依赖仅 type-only），round-trip 幂等可测。
 */
import type { Node, Edge } from '@xyflow/react';
import type { workflow_graph, workflow_view, workflow_runtime, graph_node, graph_edge, node_runtime_status } from './types.ts';
import { node_name } from './canonical.ts';

export interface workflow_projection {
    nodes: Node[];
    edges: Edge[];
}

const AUTO_POSITION_X = 100;
const AUTO_POSITION_Y = 100;
const AUTO_POSITION_STEP_X = 50;
const AUTO_POSITION_STEP_Y = 30;

/**
 * 被点击置顶节点的投影 zIndex。
 *
 * 运行结果面板（node-result）是节点的绝对定位子元素，故其层叠被本节点
 * （`.react-flow__node` 具有非 auto zIndex 形成 stacking context）约束；
 * 要让被点击节点的运行结果盖过其它节点，必须抬高该节点本身的 zIndex。
 * 该值需高于 React Flow 选中节点抬高量（SELECTED_NODE_Z=1000），
 * 保证置顶节点在其它节点（含选中/拖拽中节点）之上。
 */
const TOP_RESULT_Z = 2000;

/**
 * 构建单个 ReactFlow 节点（canonical 节点 → 投影节点）。
 * measured 提供时字段随节点携带，供 adoptUserNodes 保持节点已测尺寸（避免重测闪烁）。
 * zIndex 提供时写入节点，用于被点击置顶的运行结果节点盖过其它节点。
 * selected 提供时写入节点（受控选择态），使 React Flow 删除热键能按 selected 命中目标。
 */
function build_rf_node(
    n: graph_node,
    position: { x: number; y: number },
    status: node_runtime_status | undefined,
    selected: boolean,
    measured?: { width: number; height: number },
    zIndex?: number,
): Node {
    const node: Node = {
        id: n.id,
        type: n.type,
        position,
        selected,
        data: {
            ...n,
            label: node_name(n),
            status,
        },
    };
    if (measured) {
        node.measured = measured;
    }
    if (zIndex !== undefined) {
        node.zIndex = zIndex;
    }
    return node;
}

/**
 * 构建单个 ReactFlow 边（canonical 边 → 投影边）。
 */
function build_rf_edge(e: graph_edge): Edge {
    return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        type: 'edge',
        data: { condition: e.condition },
        hidden: !e.target,
    };
}

/**
 * canonical + view(+runtime) → ReactFlow 投影。
 * 节点 data 携带 canonical 字段（round-trip 保持）+ label（config.name）+ status（runtime）。
 */
export function from_canonical(
    graph: workflow_graph,
    view: workflow_view,
    runtime?: workflow_runtime,
): workflow_projection {
    let autoIndex = 0;
    const nodes: Node[] = graph.nodes.map((n) => {
        const position = view.positions[n.id] ?? {
            x: AUTO_POSITION_X + autoIndex * AUTO_POSITION_STEP_X,
            y: AUTO_POSITION_Y + autoIndex * AUTO_POSITION_STEP_Y,
        };
        autoIndex++;
        return build_rf_node(n, position, runtime?.nodes[n.id], false);
    });

    const edges: Edge[] = graph.edges.map(build_rf_edge);

    return { nodes, edges };
}

/** 单节点投影缓存条目：输入指纹（canonical 引用 / 位置 / 状态 / 选择态 / zIndex）+ 稳定投影对象。 */
interface node_projection_entry {
    node: Node;
    source: graph_node;
    position: { x: number; y: number };
    status: node_runtime_status | undefined;
    selected: boolean;
    zIndex: number | undefined;
}

/** 单边投影缓存条目：canonical 引用 + 稳定投影对象。 */
interface edge_projection_entry {
    edge: Edge;
    source: graph_edge;
}

/** 投影缓存：按 id 记忆上次投影，供 project_stable 复用稳定对象引用。 */
export interface projection_cache {
    nodes: Map<string, node_projection_entry>;
    edges: Map<string, edge_projection_entry>;
}

/** 节点已测尺寸（来自 React Flow 内部节点；初始时 width/height 可能为 undefined）。 */
interface projection_node_measure {
    width?: number;
    height?: number;
}

/**
 * 稳定的三切片投影：仅当节点的 canonical 引用 / 位置 / 状态变化时才生成新对象，
 * 否则复用缓存对象。保持 React Flow adoptUserNodes 的 checkEquality 快速路径，
 * 避免每次渲染都重置节点 measured 尺寸并重测（拖拽闪烁 + 全画布重渲染的根因）。
 * node_lookup 提供当前已测尺寸，使被拖拽（每帧重建）的节点不因 measured 归零而闪现隐藏。
 */
export function project_stable(
    graph: workflow_graph,
    view: workflow_view,
    runtime: workflow_runtime | undefined,
    cache: projection_cache,
    node_lookup?: ReadonlyMap<string, { measured?: projection_node_measure }>,
    topNodeId?: string | null,
): workflow_projection {
    let autoIndex = 0;
    const next_nodes = new Map<string, node_projection_entry>();
    const selectedNodeIds = view.selectedNodeIds ?? [];
    const nodes: Node[] = graph.nodes.map((n) => {
        const position = view.positions[n.id] ?? {
            x: AUTO_POSITION_X + autoIndex * AUTO_POSITION_STEP_X,
            y: AUTO_POSITION_Y + autoIndex * AUTO_POSITION_STEP_Y,
        };
        autoIndex++;
        const status = runtime?.nodes[n.id];
        const selected = selectedNodeIds.includes(n.id);
        const zIndex = n.id === topNodeId ? TOP_RESULT_Z : undefined;
        const prev = cache.nodes.get(n.id);
        if (
            prev
            && prev.source === n
            && prev.position.x === position.x
            && prev.position.y === position.y
            && prev.status === status
            && prev.selected === selected
            && prev.zIndex === zIndex
        ) {
            next_nodes.set(n.id, prev);
            return prev.node;
        }
        const measured = node_lookup?.get(n.id)?.measured;
        const node = build_rf_node(
            n,
            position,
            status,
            selected,
            measured && typeof measured.width === 'number' && typeof measured.height === 'number'
                ? { width: measured.width, height: measured.height }
                : undefined,
            zIndex,
        );
        next_nodes.set(n.id, { node, source: n, position, status, selected, zIndex });
        return node;
    });

    const next_edges = new Map<string, edge_projection_entry>();
    const edges: Edge[] = graph.edges.map((e) => {
        const prev = cache.edges.get(e.id);
        if (prev && prev.source === e) {
            next_edges.set(e.id, prev);
            return prev.edge;
        }
        const edge = build_rf_edge(e);
        next_edges.set(e.id, { edge, source: e });
        return edge;
    });

    cache.nodes = next_nodes;
    cache.edges = next_edges;
    return { nodes, edges };
}

/**
 * ReactFlow 投影 → canonical（+ 位置视图）。仅提取 canonical 字段，丢弃 label/status 等 UI 附加。
 */
export function to_canonical(nodes: Node[], edges: Edge[]): { graph: workflow_graph; view: workflow_view } {
    const positions: Record<string, { x: number; y: number }> = {};
    const graphNodes: graph_node[] = nodes.map((n) => {
        const data = (n.data ?? {}) as Record<string, unknown>;
        positions[n.id] = { x: n.position.x, y: n.position.y };
        const node: graph_node = { id: n.id, type: n.type as graph_node['type'] };
        if (data.config !== undefined) {
            node.config = data.config as graph_node['config'];
        }
        if (data.input !== undefined) {
            node.input = data.input as graph_node['input'];
        }
        if (data.output !== undefined) {
            node.output = data.output as graph_node['output'];
        }
        return node;
    });

    const graphEdges: graph_edge[] = edges.map((e) => {
        const data = (e.data ?? {}) as { condition?: graph_edge['condition'] };
        const edge: graph_edge = { id: e.id, source: e.source, target: e.target };
        if (e.sourceHandle) {
            edge.sourceHandle = e.sourceHandle;
        }
        if (data.condition) {
            edge.condition = data.condition;
        }
        return edge;
    });

    return {
        graph: { id: '', name: '', nodes: graphNodes, edges: graphEdges },
        view: { positions },
    };
}
