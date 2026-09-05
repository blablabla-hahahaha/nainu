/**
 * canonical 图纯函数：节点/边/视图的读取与变换。
 * 无 React 依赖、无运行时三方依赖（门禁 round-trip 可 import）。
 */
import type { workflow_graph, graph_node, graph_edge, graph_input_field, workflow_view } from './types.ts';

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

/**
 * 节点类型 → 默认显示名（config.name 缺失时的后备）。
 * 未列入的类型回退到 DSL 类型名；仅维护需要「用户可读默认名」的类型。
 */
const default_node_name_by_type: Partial<Record<graph_node['type'], string>> = {
    SCRIPT: '编码脚本',
};

/** 节点显示名：config.name ?? 类型默认显示名。 */
export function node_name(node: graph_node): string {
    const name = node_config(node)['name'];
    return typeof name === 'string' && name.trim()
        ? name
        : (default_node_name_by_type[node.type] ?? node.type);
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

/**
 * 派生 CONDITION 节点的输入字段。
 *
 * 收集给定条件出边中 compare.field 类型为 INTERNAL_REF 的引用（按引用 value 去重），
 * 使节点声明的 input 与其出边条件引用的上游输出保持一致，而不只存在于边上的条件表达式内。
 * 纯函数；保证「条件分支依赖哪个上游输出」对 DSL / 运行时输入快照 / 前端展示一致可见。
 */
export function condition_node_input(edges: graph_edge[]): graph_input_field[] {
    const seen = new Set<string>();
    const result: graph_input_field[] = [];
    for (const edge of edges) {
        const compares = edge.condition?.conditions ?? [];
        for (const compare of compares) {
            const field = compare.field;
            if (!field || field.type !== 'INTERNAL_REF') {
                continue;
            }
            const ref = field.value;
            if (!ref || seen.has(ref)) {
                continue;
            }
            seen.add(ref);
            result.push({ key: field.key || ref, type: field.type, value: ref });
        }
    }
    return result;
}
