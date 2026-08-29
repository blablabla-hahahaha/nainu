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
    const outputs: output_field[] = (node?.output ?? []).map(o => ({
        alias: o.keyAlias && o.keyAlias.length > 0 ? o.keyAlias : o.key,
        value: o.key,
    }));
    return {
        label: typeof config['name'] === 'string' ? config['name'] as string : '指定输出',
        inputs,
        jsonTemplate: typeof config['jsonTemplate'] === 'string' ? config['jsonTemplate'] as string : '{\n  "result": ""\n}',
        outputs,
    };
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

    if (values.outputs.length === 0) return '至少需要一个输出字段';

    const output_aliases = new Set<string>();
    for (const o of values.outputs) {
        if (!o.alias.trim()) return '输出字段的别名不能为空';
        if (output_aliases.has(o.alias)) return `输出字段别名重复：${o.alias}`;
        output_aliases.add(o.alias);
    }

    for (const o of values.outputs) {
        if (!o.value.trim()) return `输出字段「${o.alias}」的 JSON key 不能为空`;
        if (!template_keys.has(o.value)) {
            return `输出字段「${o.alias}」的 JSON key 「${o.value}」不存在于模板顶层`;
        }
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
                onValuesChange={(_, all_values: output_node_form_values) => {
                    dispatch({
                        type: 'graph/update_node',
                        nodeId,
                        config: {
                            name: all_values.label,
                            jsonTemplate: all_values.jsonTemplate,
                        },
                        input: (all_values.inputs ?? []).map(f => ({
                            key: f.alias ?? '',
                            type: f.type ?? node_field_definition_support.CUSTOM,
                            value: f.value,
                        })),
                        output: (all_values.outputs ?? []).map(o => ({
                            key: o.value,
                            keyAlias: o.alias,
                        })),
                    });
                }}
            >
                <Form.Item label="输入字段">
                    <NodeInputFields name="inputs" />
                </Form.Item>

                <MonacoCodeEditorItem label="输出内容" name="jsonTemplate" />

                <Form.Item label="输出字段">
                    <NodeOutputFields name="outputs" />
                </Form.Item>
            </Form>
        </NodeSetting>
    );
}
