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
import { useReactFlow, useNodes } from '@xyflow/react';

interface output_node_form_values {
    label: string;
    inputs: node_field_definition[];
    jsonTemplate: string;
    outputs: output_field[];
}

function build_initial_output_settings(nodeData: Record<string, unknown> | undefined): output_node_form_values {
    const d = (nodeData ?? {}) as Record<string, unknown>;
    const inputs_raw = (d.inputs as unknown[] | undefined) ?? [];
    const inputs: node_field_definition[] = inputs_raw.map(x => {
        const r = (x ?? {}) as Record<string, unknown>;
        return {
            id: (r.id as string) ?? '',
            alias: (r.alias as string) ?? '',
            type: (r.type as node_field_definition['type']) ?? node_field_definition_support.CUSTOM,
            value: (r.value as string) ?? '',
        };
    });
    const json_template = (d.jsonTemplate as string) ?? '{\n  "result": ""\n}';
    const outputs_raw = (d.outputs as unknown[] | undefined) ?? [];
    const outputs: output_field[] = outputs_raw.map(x => {
        const r = (x ?? {}) as Record<string, unknown>;
        return {
            id: (r.id as string) ?? '',
            alias: (r.alias as string) ?? '',
            value: (r.value as string) ?? '',
        };
    });
    return {
        label: (d.label as string) ?? '指定输出',
        inputs: inputs.length > 0 ? inputs : [],
        jsonTemplate: json_template,
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
 * 输出节点 Settings 面板（输入字段 + JSON 模板 + 输出字段 + 从模板生成）。
 */
export default function OutputSettings({ nodeId, onClose }: node_settings_props) {
    const [form] = Form.useForm();
    const reactFlow = useReactFlow();
    const nodes = useNodes();

    useEffect(() => {
        const currentNode = nodes.find(n => n.id === nodeId);
        if (currentNode) {
            const initial = build_initial_output_settings(currentNode.data);
            form.setFieldsValue(initial);
        }
    }, [nodeId, form, nodes]);

    return (
        <NodeSetting
            nodeId={nodeId}
            onClose={onClose}
            onValidate={() => validate_output_settings(form.getFieldsValue() as output_node_form_values)}
        >
            <Form
                form={form}
                layout="vertical"
                onValuesChange={(_, all_values) => reactFlow.updateNodeData(nodeId, all_values)}
            >

                <Form.Item label="输入字段">
                    <NodeInputFields name="inputs" />
                </Form.Item>

                <MonacoCodeEditorItem label="输出内容" name="content" />

                <Form.Item label="输出字段">
                    <NodeOutputFields name="outputs" />
                </Form.Item>
            </Form>
        </NodeSetting>
    );
}
