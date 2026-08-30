import { uuid, short_uuid } from '@/utils/id-gen';
import { node_name } from '@/components/workflow/graph/canonical';
import type { graph_node, graph_edge } from '@/components/workflow/graph/types';

export type node_field_type = "CUSTOM" | "INTERNAL_REF" | "EXTERNAL_REF";

/**
 * 内部引用时展示的可选上游输出字段。
 */
export interface internal_ref_option {
    label: string;
    value: string;
    ref_name?: string;
}

/**
 * 基础字段定义（所有字段共有的属性）。
 */
export interface node_field_definition {
    id?: string;
    alias?: string;
    type?: node_field_type;
    value: string;
}

/**
 * 输入字段定义（使用完整的基础定义）。
 */
export type node_input_field_definition = node_field_definition;

/**
 * 输出字段定义（不需要 type）。
 */
export interface node_output_field_definition {
    id?: string;
    alias: string;
    value: string;
}

/**
 * 确保对象有 ID，如果没有则生成一个。
 */
export function with_id<T extends { id?: string }>(item: T): T {
    if (item.id && item.id.trim()) return item;
    return { ...item, id: uuid() };
}

/**
 * 批量确保数组中的每个对象都有 ID。
 */
export function ensure_ids<T extends { id?: string }>(items: T[]): { changed: boolean; result: T[] } {
    let changed = false;
    const result = items.map(item => {
        if (!item.id || !item.id.trim()) {
            changed = true;
            return { ...item, id: uuid() };
        }
        return item;
    });
    return { changed, result };
}

export const node_field_definition_support = {    CUSTOM: "CUSTOM" as const,
    INTERNAL_REF: "INTERNAL_REF" as const,
    EXTERNAL_REF: "EXTERNAL_REF" as const,

    getOptions() {
        return [
            { label: "自定义", value: "CUSTOM" as const },
            { label: "内部引用", value: "INTERNAL_REF" as const },
            { label: "外部引用", value: "EXTERNAL_REF" as const },
        ];
    },

    getLabel(type: node_field_type) {
        switch (type) {
            case "CUSTOM": return "自定义";
            case "INTERNAL_REF": return "内部引用";
            case "EXTERNAL_REF": return "外部引用";
        }
    },

    getDefaultDefinition(): node_field_definition {
        return {
            id: uuid(),
            alias: short_uuid(),
            type: node_field_definition_support.CUSTOM,
            value: "",
        };
    },
};

/**
 * 计算某节点的全部上游输出字段，供 INTERNAL_REF 下拉使用。
 * 参考名取 keyAlias（为空时退到 key）；值为 `${nodeId}:${refName}`。纯函数，读取 canonical 图。
 */
export function compute_internal_ref_options(
    nodeId: string,
    nodes: graph_node[],
    edges: graph_edge[],
): internal_ref_option[] {
    const reverse_adj = new Map<string, string[]>();
    for (const edge of edges) {
        const sources = reverse_adj.get(edge.target) ?? [];
        sources.push(edge.source);
        reverse_adj.set(edge.target, sources);
    }

    const visited = new Set<string>();
    const queue = [nodeId];
    const upstream_node_ids: string[] = [];

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;
        for (const src of reverse_adj.get(current) ?? []) {
            if (!visited.has(src)) {
                visited.add(src);
                queue.push(src);
                upstream_node_ids.push(src);
            }
        }
    }

    const node_map = new Map(nodes.map(n => [n.id, n]));
    const result: internal_ref_option[] = [];

    for (const upstream_id of upstream_node_ids) {
        const upstream = node_map.get(upstream_id);
        if (!upstream) continue;
        const node_label = node_name(upstream);
        for (const o of upstream.output ?? []) {
            const ref_name = o.keyAlias && o.keyAlias.length > 0 ? o.keyAlias : o.key;
            if (!ref_name.trim()) continue;
            result.push({
                label: `${node_label} → ${ref_name}`,
                value: `${upstream_id}:${ref_name}`,
                ref_name,
            });
        }
    }

    return result;
}
