import type { node_field_definition, node_output_field_definition, node_field_type } from "@/components/workflow/extends/node-field/node-field";
import type { monaco_code_editor_language_option } from "@/components/monaco-code-editor";
import type { graph_node } from "@/components/workflow/graph/types";

/**
 * 编码（SCRIPT）节点支持的脚本语言（与后端 SandboxLanguage 线上小写 code 对齐）。
 */
export type script_language = 'javascript' | 'python';

/**
 * Monaco 下拉语言选项（仅 JS / Python，与沙箱支持范围一致）。
 */
export const script_language_options: monaco_code_editor_language_option[] = [
    { key: 'python', label: 'Python' },
    { key: 'javascript', label: 'JavaScript' },
];

/**
 * 各语言默认示例脚本（约定定义 main()，返回值作为节点输出）。
 * 这是新节点快速开始的教学 demo：演示「编写逻辑 → 返回对象（对应输出字段）」的契约。
 */
export const default_script_by_language: Record<script_language, string> = {
    python: "def main():\n    # 在这里编写你的逻辑；返回值将写入节点输出字段\n    message = '你好，编码脚本'\n    return {'message': message}",
    javascript: "function main() {\n  // 在这里编写你的逻辑；返回值将写入节点输出字段\n  const message = '你好，编码脚本';\n  return { message: message };\n}",
};

/**
 * 判断脚本内容是否为某个语言的默认示例。
 * 用于切换语言时仅重写「未被用户修改」的 demo，保留用户已手写的代码。
 */
export function is_default_script(script: string): boolean {
    return Object.values(default_script_by_language).includes(script);
}

/**
 * 编辑面板表单值（从 canonical 节点 config/input/output 初始化，经 watch 写回）。
 */
export interface script_node_form_values {
    language: script_language;
    script: string;
    timeout_ms?: number;
    max_memory_mb?: number;
    max_output_bytes?: number;
    inputs: node_field_definition[];
    outputs: node_output_field_definition[];
}

/**
 * 判断字符串是否为受支持的脚本语言。
 */
export function is_script_language(value: string): value is script_language {
    return value === 'python' || value === 'javascript';
}

/**
 * 从 canonical 节点构造初始表单值：缺失字段落到默认（语言 javascript + 对应模板）。
 */
export function build_initial_script_values(node: graph_node | undefined): script_node_form_values {
    const config = (node?.config ?? {}) as Record<string, unknown>;
    const raw_language = typeof config['language'] === 'string' ? config['language'] : 'javascript';
    const language = is_script_language(raw_language) ? raw_language : 'javascript';
    const script = typeof config['script'] === 'string'
        ? config['script']
        : default_script_by_language[language];
    // 兼容历史错配：config.language 与 config.script 可能脱节（如 language 仍为 javascript 而 script 已是 python demo），
    // 若 script 恰是某语言的默认示例，则让语言随脚本对齐，确保 language/script 始终配对（否则沙箱用错语言执行）。
    let resolved_language = language;
    if (typeof config['script'] === 'string') {
        for (const [lang, demo] of Object.entries(default_script_by_language)) {
            if (demo === script && is_script_language(lang)) {
                resolved_language = lang;
                break;
            }
        }
    }
    const limits = (config['limits'] ?? {}) as Record<string, unknown>;
    const inputs: node_field_definition[] = (node?.input ?? []).map(f => ({
        alias: f.key,
        type: f.type,
        value: f.value,
    }));
    const outputs: node_output_field_definition[] = (node?.output ?? []).map(o => ({
        value: o.key,
        alias: o.keyAlias && o.keyAlias.length > 0 ? o.keyAlias : o.key,
    }));
    return {
        language: resolved_language,
        script,
        timeout_ms: typeof limits['timeoutMs'] === 'number' ? limits['timeoutMs'] as number : undefined,
        max_memory_mb: typeof limits['maxMemoryMb'] === 'number' ? limits['maxMemoryMb'] as number : undefined,
        max_output_bytes: typeof limits['maxOutputBytes'] === 'number' ? limits['maxOutputBytes'] as number : undefined,
        inputs,
        outputs,
    };
}

/**
 * 从表单值构建 config.limits（仅收录已填写的上限；全部为空则返回空对象）。
 */
export function build_limits(values: script_node_form_values): Record<string, number> {
    const limits: Record<string, number> = {};
    if (values.timeout_ms != null) limits['timeoutMs'] = values.timeout_ms;
    if (values.max_memory_mb != null) limits['maxMemoryMb'] = values.max_memory_mb;
    if (values.max_output_bytes != null) limits['maxOutputBytes'] = values.max_output_bytes;
    return limits;
}

/**
 * 判断 config.limits（可空对象）与表单值是否一致。
 */
export function limits_equal(current_limits: unknown, values: script_node_form_values): boolean {
    const cl = (current_limits ?? {}) as Record<string, number>;
    return (cl['timeoutMs'] ?? null) === (values.timeout_ms ?? null)
        && (cl['maxMemoryMb'] ?? null) === (values.max_memory_mb ?? null)
        && (cl['maxOutputBytes'] ?? null) === (values.max_output_bytes ?? null);
}

/**
 * 判断输入字段与 canonical node.input 是否一致（按 alias/type/value）。
 */
export function inputs_equal(a: node_field_definition[], b: node_field_definition[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((f, i) => (f.alias ?? '') === (b[i].alias ?? '')
        && (f.type ?? '') === (b[i].type ?? '')
        && (f.value ?? '') === (b[i].value ?? ''));
}

/**
 * 判断输出字段与 canonical node.output 是否一致（按 value/alias）。
 */
export function outputs_equal(a: node_output_field_definition[], b: node_output_field_definition[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((o, i) => o.value === b[i].value && o.alias === b[i].alias);
}

/**
 * 把表单值投影为 canonial node.input（key=alias，type 缺省 CUSTOM）。
 */
export function to_input_fields(values: node_field_definition[]): { key: string; type: node_field_type; value: string }[] {
    return values.map(f => ({
        key: f.alias ?? '',
        type: f.type ?? 'CUSTOM',
        value: f.value,
    }));
}

/**
 * 校验表单：脚本非空 + 输入/输出字段完整且同节点别名唯一；返回错误文案或 null。
 */
export function validate_script_values(values: script_node_form_values): null | string {
    if (typeof values.script !== 'string' || values.script.trim() === '') return '脚本内容不能为空';

    const input_aliases = new Set<string>();
    for (const f of values.inputs) {
        if (!(f.alias ?? '').trim()) return '输入字段的别名不能为空';
        if (input_aliases.has(f.alias ?? '')) return `输入字段别名重复：${f.alias}`;
        input_aliases.add(f.alias ?? '');
    }
    for (const f of values.inputs) {
        if (f.type === 'CUSTOM' && !(f.value ?? '').trim()) return `输入字段「${f.alias || '?'}」的值不能为空`;
    }

    const output_aliases = new Set<string>();
    for (const o of values.outputs) {
        if (!o.value.trim()) return '输出字段的返回值 key 不能为空';
        if (!o.alias.trim()) return `输出字段「${o.value}」的别名不能为空`;
        if (output_aliases.has(o.alias)) return `输出字段别名重复：${o.alias}`;
        output_aliases.add(o.alias);
    }

    return null;
}
