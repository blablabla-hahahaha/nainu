/**
 * canonical ↔ ReactFlow 双向投影：ReactFlow 节点/边是视图，canonical 图是唯一事实源。
 * 纯逻辑（三方依赖仅 type-only），round-trip 幂等可测。
 */
import type { Node, Edge } from '@xyflow/react';
import type { workflow_graph, workflow_view, workflow_runtime, graph_node, graph_edge } from './types.ts';
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
        return {
            id: n.id,
            type: n.type,
            position,
            data: {
                ...n,
                label: node_name(n),
                status: runtime?.nodes[n.id],
            },
        };
    });

    const edges: Edge[] = graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        type: 'edge',
        data: { condition: e.condition },
        hidden: !e.target,
    }));

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
