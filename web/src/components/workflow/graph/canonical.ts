/**
 * canonical 图纯函数：节点/边/视图的读取与变换。
 * 无 React 依赖、无运行时三方依赖（门禁 round-trip 可 import）。
 */
import type { workflow_graph, graph_node, graph_edge, workflow_view } from './types.ts';

const VIEW_KEY = 'view';

/** 从 graph.meta 读取视图模型（约定 key = meta.view），缺失返回空视图。 */
export function get_view(graph: workflow_graph): workflow_view {
    const meta = (graph.meta ?? {}) as Record<string, unknown>;
    const view = meta[VIEW_KEY] as workflow_view | undefined;
    return view ?? { positions: {} };
}

/** 写入视图模型到 graph.meta.view（不可变）。 */
export function with_view(graph: workflow_graph, view: workflow_view): workflow_graph {
    return {
        ...graph,
        meta: { ...((graph.meta ?? {}) as Record<string, unknown>), [VIEW_KEY]: view },
    };
}

/** 节点 config 的宽松读取（生成类型 config 为空对象类型）。 */
export function node_config(node: graph_node): Record<string, unknown> {
    return (node.config ?? {}) as Record<string, unknown>;
}

/** 节点显示名：config.name ?? type。 */
export function node_name(node: graph_node): string {
    const name = node_config(node)['name'];
    return typeof name === 'string' && name.trim() ? name : node.type;
}

export function find_node(graph: workflow_graph, nodeId: string): graph_node | undefined {
    return graph.nodes.find((n) => n.id === nodeId);
}

export function find_edge(graph: workflow_graph, edgeId: string): graph_edge | undefined {
    return graph.edges.find((e) => e.id === edgeId);
}

/** 节点输出引用名集合（keyAlias ?? key）。 */
export function node_output_names(node: graph_node): Set<string> {
    const names = new Set<string>();
    for (const o of node.output ?? []) {
        names.add(o.keyAlias && o.keyAlias.length > 0 ? o.keyAlias : o.key);
    }
    return names;
}

/** 条件边判定（typed conditional edge）。 */
export function is_condition_edge(edge: graph_edge): boolean {
    return edge.condition !== undefined;
}
