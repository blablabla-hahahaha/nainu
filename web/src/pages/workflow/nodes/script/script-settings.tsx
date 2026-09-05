import { useCallback, useEffect } from 'react';
import { Flex, Form, Input, InputNumber } from 'antd';
import { NodeSetting, type node_settings_props } from '@/components/workflow/components/node-setting';
import { NodeInputFields } from '@/components/workflow/extends/node-field/node-input-fields';
import { NodeOutputFields } from '@/components/workflow/extends/node-field/node-output-fields';
import type { node_field_definition, node_output_field_definition } from '@/components/workflow/extends/node-field/node-field';
import { MonacoCodeEditorItem } from '@/components/monaco-code-editor';
import type { monaco_code_editor_language } from '@/components/monaco-code-editor';
import { useWorkflowState } from '@/components/workflow/graph';
import type { graph_node } from '@/components/workflow/graph/types';
import {
    build_initial_script_values,
    build_limits,
    default_script_by_language,
    inputs_equal,
    is_default_script,
    is_script_language,
    limits_equal,
    outputs_equal,
    script_language_options,
    to_input_fields,
    validate_script_values,
    type script_language,
    type script_node_form_values,
} from './script-config';

/**
 * graph/update_node 动作载荷（与 reducer 的 SCRIPT 分支对齐）。
 */
interface script_node_update_payload {
    type: 'graph/update_node';
    nodeId: string;
    config?: Record<string, unknown>;
    input?: graph_node['input'];
    output?: graph_node['output'];
}

/**
 * 编码（SCRIPT）节点 Settings 面板：读写 canonical 节点的 config（language/script/limits）与 input/output（经 dispatch）。
 * 脚本在独立沙箱服务执行（master 远程调用），面板仅做结构编辑，不本地执行。
 */
export default function ScriptSettings({ nodeId, onClose }: node_settings_props) {
    const [form] = Form.useForm();
    const { state, dispatch } = useWorkflowState();
    const node = state.graph.nodes.find((n) => n.id === nodeId);

    const watched = Form.useWatch([], form) as script_node_form_values | undefined;

    // 切换语言时：仅当脚本仍是某语言的默认 demo（未被用户改写）时，重写为新语言的默认 demo，
    // 保留用户已手写的逻辑——demo 只做「快速开始」，不覆盖用户工作。
    const handle_language_change = useCallback(
        (next: monaco_code_editor_language) => {
            if (!is_script_language(next)) return;
            const current_script = form.getFieldValue('script');
            if (typeof current_script === 'string' && is_default_script(current_script)) {
                // 语言与脚本一次性写入，避免二者落到不同节点/不同步状态。
                form.setFieldsValue({ language: next, script: default_script_by_language[next] });
            }
        },
        [form],
    );

    useEffect(() => {
        if (!watched) return;
        const current = state.graph.nodes.find((n) => n.id === nodeId);
        if (!current) return;
        const current_config = (current.config ?? {}) as Record<string, unknown>;
        const language = is_script_language(watched.language) ? watched.language : 'javascript';
        const script = watched.script ?? '';

        const current_inputs: node_field_definition[] = (current.input ?? []).map((f) => ({
            alias: f.key,
            type: f.type,
            value: f.value,
        }));
        const current_outputs: node_output_field_definition[] = (current.output ?? []).map((o) => ({
            value: o.key,
            alias: o.keyAlias ?? o.key,
        }));

        const config_changed = (current_config['language'] ?? 'javascript') !== language
            || (current_config['script'] ?? '') !== script
            || !limits_equal(current_config['limits'], watched);
        const inputs_changed = !inputs_equal(watched.inputs ?? [], current_inputs);
        const outputs_changed = !outputs_equal(watched.outputs ?? [], current_outputs);
        if (!config_changed && !inputs_changed && !outputs_changed) return;

        const next_config: Record<string, unknown> = { ...current_config, language, script };
        const limits = build_limits(watched);
        if (Object.keys(limits).length > 0) {
            next_config['limits'] = limits;
        } else {
            delete next_config['limits'];
        }

        const update: script_node_update_payload = { type: 'graph/update_node', nodeId };
        if (config_changed) update.config = next_config;
        if (inputs_changed) update.input = to_input_fields(watched.inputs ?? []);
        if (outputs_changed) update.output = (watched.outputs ?? []).map((o) => ({ key: o.value, keyAlias: o.alias }));
        dispatch(update);
    }, [nodeId, watched, state.graph, form, dispatch]);

    const raw_language: string = watched?.language ?? 'javascript';
    const language: script_language = is_script_language(raw_language) ? raw_language : 'javascript';

    return (
        <NodeSetting
            nodeId={nodeId}
            onClose={onClose}
            onValidate={() => validate_script_values(form.getFieldsValue() as script_node_form_values)}
        >
            <Form form={form} layout="vertical" initialValues={build_initial_script_values(node)}>
                {/* language 由 Monaco 下拉经 setFieldValue 写入，需注册为表单字段使 useWatch 观测到并持久化 */}
                <Form.Item name="language" hidden>
                    <Input />
                </Form.Item>
                <Form.Item label="输入字段">
                    <NodeInputFields name="inputs" nodeId={nodeId} />
                </Form.Item>

                <MonacoCodeEditorItem
                    label="脚本代码"
                    name="script"
                    language_name="language"
                    language={language}
                    language_options={script_language_options}
                    width="100%"
                    on_language_change={handle_language_change}
                    tooltip="脚本必须定义 main()；返回值写回节点输出字段。脚本在独立沙箱服务执行。"
                />

                <Form.Item label="资源上限（可选）">
                    <Flex gap={8}>
                        <Form.Item name="timeout_ms" noStyle>
                            <InputNumber min={0} placeholder="超时 ms" style={{ width: 150 }} />
                        </Form.Item>
                        <Form.Item name="max_memory_mb" noStyle>
                            <InputNumber min={0} placeholder="内存 MB" style={{ width: 150 }} />
                        </Form.Item>
                        <Form.Item name="max_output_bytes" noStyle>
                            <InputNumber min={0} placeholder="输出上限 B" style={{ width: 170 }} />
                        </Form.Item>
                    </Flex>
                </Form.Item>

                <Form.Item label="输出字段">
                    <NodeOutputFields name="outputs" />
                </Form.Item>
            </Form>
        </NodeSetting>
    );
}
