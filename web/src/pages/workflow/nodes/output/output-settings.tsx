import { useEffect } from 'react';
import { Form } from 'antd';
import { NodeSetting, type node_settings_props } from '@/components/workflow/components/node-setting';
import {
    node_field_definition_support,
    type node_field_definition,
} from '@/components/workflow/extends/node-field/node-field';
import { NodeInputFields } from '@/components/workflow/extends/node-field/node-input-fields';
import { NodeOutputFields } from '@/components/workflow/extends/node-field/node-output-fields';
import {
    output_field_support,
    type output_field,
} from "@/pages/workflow/nodes/output/output-field";
import { MonacoCodeEditorItem } from "@/components/monaco-code-editor";
import { useWorkflowState } from '@/components/workflow/graph';
import type { graph_node } from '@/components/workflow/graph/types';

interface output_node_form_values {
    label: string;
    inputs: node_field_definition[];
    jsonTemplate: string;
    outputs: output_field[];
}

function build_initial_output_settings(node: graph_node | undefined): output_node_form_values {
    const config = (node?.config ?? {}) as Record<string, unknown>;
    const inputs: node_field_definition[] = (node?.input ?? []).map(f => ({
        alias: f.key,
        type: f.type,
        value: f.value,
    }));
    const jsonTemplate = typeof config['jsonTemplate'] === 'string' ? config['jsonTemplate'] as string : '{\n  "result": ""\n}';
    const raw_outputs: output_field[] = (node?.output ?? []).map(o => ({
        alias: o.keyAlias && o.keyAlias.length > 0 ? o.keyAlias : o.key,
        value: o.key,
    }));
    // 输出字段与模板顶层 key 对齐：剔除陈旧、补齐缺失，避免显示不在模板里的输出。
    const template_keys = output_field_support.getTemplateKeys(jsonTemplate);
    const outputs = output_field_support.isValidTemplate(jsonTemplate)
        ? output_field_support.reconcile_outputs(raw_outputs, template_keys)
        : raw_outputs;
    return {
        label: typeof config['name'] === 'string' ? config['name'] as string : '指定输出',
        inputs,
        jsonTemplate,
        outputs,
    };
}

/** 判断两次输出字段是否一致（按 value + alias）。 */
function outputs_equal(a: output_field[], b: output_field[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((o, i) => o.value === b[i].value && o.alias === b[i].alias);
}
function validate_output_settings(values: output_node_form_values): null | string {
    if (!values.label.trim()) return '节点名称不能为空';

    const input_aliases = new Set<string>();
    for (const f of values.inputs) {
        if (!f.alias?.trim()) return '输入字段的别名不能为空';
        if (input_aliases.has(f.alias)) return `输入字段别名重复：${f.alias}`;
        input_aliases.add(f.alias);
    }

    for (const f of values.inputs) {
        if (!f.value?.trim()) return `输入字段「${f.alias || '?'}」的来源不能为空`;
    }

    if (values.jsonTemplate.trim() === '') return 'JSON 模板不能为空';
    if (!output_field_support.isValidTemplate(values.jsonTemplate)) {
        return 'JSON 模板必须是一个合法的 JSON 对象（非数组、非原始值）';
    }

    const template_keys = output_field_support.getTemplateKeys(values.jsonTemplate);

    // 输出字段：默认允许为空（用户手动添加）；已添加的行须完整（key + 别名）且同节点别名唯一。
    const output_aliases = new Set<string>();
    for (const o of values.outputs) {
        if (!o.value.trim()) return `输出字段的 JSON key 不能为空`;
        if (!template_keys.has(o.value)) {
            return `输出字段的 JSON key 「${o.value}」不存在于模板顶层`;
        }
        if (!o.alias.trim()) return `输出字段「${o.value}」的别名不能为空`;
        if (output_aliases.has(o.alias)) return `输出字段别名重复：${o.alias}`;
        output_aliases.add(o.alias);
    }

    return null;
}

/**
 * 输出节点 Settings 面板：读写 canonical 节点的 config/input/output（经 dispatch）。
 */
export default function OutputSettings({ nodeId, onClose }: node_settings_props) {
    const [form] = Form.useForm();
    const { state, dispatch } = useWorkflowState();
    const node = state.graph.nodes.find(n => n.id === nodeId);

    // 监听整份表单值，把「面板显示的值」（含 Monaco 经 setFieldValue 对 jsonTemplate 的修改）写回 canonical 图，
    // 使运行始终使用与面板一致的内容；模板变化时先让输出字段与模板顶层 key 对齐（剔除陈旧、补齐缺失）。
    const watched = Form.useWatch([], form) as output_node_form_values | undefined;

    useEffect(() => {
        if (!watched) return;
        const current = state.graph.nodes.find(n => n.id === nodeId);
        if (!current) return;
        const current_config = (current.config ?? {}) as Record<string, unknown>;
        const current_outputs: output_field[] = (current.output ?? []).map(o => ({ value: o.key, alias: o.keyAlias ?? o.key }));
        const next_json = watched.jsonTemplate ?? '';
        let next_outputs = watched.outputs ?? [];
        const template_keys = output_field_support.getTemplateKeys(next_json);
        if (output_field_support.isValidTemplate(next_json)) {
            const reconciled = output_field_support.reconcile_outputs(next_outputs, template_keys);
            if (!outputs_equal(reconciled, next_outputs)) {
                next_outputs = reconciled;
                form.setFieldsValue({ outputs: reconciled });
            }
        }
        const config_changed = (current_config['jsonTemplate'] ?? '') !== next_json;
        const outputs_changed = !outputs_equal(next_outputs, current_outputs);
        if (config_changed || outputs_changed) {
            dispatch({
                type: 'graph/update_node',
                nodeId,
                config: { ...current_config, name: watched.label ?? '指定输出', jsonTemplate: next_json },
                input: (watched.inputs ?? []).map(f => ({
                    key: f.alias ?? '',
                    type: f.type ?? node_field_definition_support.CUSTOM,
                    value: f.value,
                })),
                output: next_outputs.map(o => ({ key: o.value, keyAlias: o.alias })),
            });
        }
    }, [nodeId, watched, state.graph, form, dispatch]);

    return (
        <NodeSetting
            nodeId={nodeId}
            onClose={onClose}
            onValidate={() => validate_output_settings(form.getFieldsValue() as output_node_form_values)}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={build_initial_output_settings(node)}
            >
                <Form.Item label="输入字段">
                    <NodeInputFields name="inputs" nodeId={nodeId} />
                </Form.Item>

                <MonacoCodeEditorItem label="输出内容" name="jsonTemplate" />

                <Form.Item label="输出字段">
                    <NodeOutputFields name="outputs" />
                </Form.Item>
            </Form>
        </NodeSetting>
    );
}
