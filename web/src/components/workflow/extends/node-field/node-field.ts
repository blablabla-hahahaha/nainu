import { uuid, short_uuid } from '@/utils/id-gen';

export type node_field_type = "CUSTOM" | "INTERNAL_REF" | "EXTERNAL_REF";

/**
 * 内部引用时展示的可选上游输出字段。
 */
export interface internal_ref_option {
    label: string;
    value: string;
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

export const node_field_definition_support = {
    CUSTOM: "CUSTOM" as const,
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
