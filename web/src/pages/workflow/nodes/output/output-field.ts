import type { node_output_field_definition } from "@/components/workflow/extends/node-field/node-field";

export type output_field = node_output_field_definition;

export const output_field_support = {

    /**
     * 解析 JSON 模板成功时返回顶层 key 集合；失败返回空集合。
     */
    getTemplateKeys(jsonStr: string): Set<string> {
        try {
            const obj = JSON.parse(jsonStr);
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return new Set();
            return new Set(Object.keys(obj));
        } catch {
            return new Set();
        }
    },

    /**
     * 判断 JSON 模板字符串是否是合法的对象 JSON。
     */
    isValidTemplate(jsonStr: string): boolean {
        try {
            const obj = JSON.parse(jsonStr);
            return !!obj && typeof obj === 'object' && !Array.isArray(obj);
        } catch {
            return false;
        }
    },
};
