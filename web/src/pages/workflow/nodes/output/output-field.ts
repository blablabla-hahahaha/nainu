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

    /**
     * 让输出字段与 JSON 模板顶层 key 对齐：
     * 保留仍在模板里的字段（含用户已设别名）与空 value 的新增/未填行，
     * 剔除已不在模板的陈旧字段，并补上模板里有但尚未暴露的 key（别名默认取 key，可再改）。
     */
    reconcile_outputs(outputs: output_field[], template_keys: Set<string>): output_field[] {
        const seen = new Set<string>();
        const result: output_field[] = [];
        for (const o of outputs) {
            if (!o.value.trim()) {
                result.push(o);
                continue;
            }
            if (template_keys.has(o.value)) {
                seen.add(o.value);
                result.push(o);
            }
        }
        for (const key of template_keys) {
            if (!seen.has(key)) {
                result.push({ value: key, alias: key });
            }
        }
        return result;
    },
};
