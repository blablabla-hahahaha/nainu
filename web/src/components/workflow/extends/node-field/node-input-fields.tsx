import { useEffect } from 'react';
import { Button, Flex, Form } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { NodeFieldItem } from './node-field-item';
import { node_field_definition_support, ensure_ids, compute_internal_ref_options } from './node-field';
import type { internal_ref_option, node_input_field_definition } from './node-field';
import { useWorkflowState } from '@/components/workflow/graph';

/**
 * node_input_fields Props：接收 Form.List 的 name 与当前节点 id。
 */
export interface node_input_fields_props {
    name: string | number | (string | number)[];
    nodeId?: string;
}

/**
 * Form.List 封装的输入字段列表（三列 alias + type + value）。
 * 经 canonical 图计算上游节点输出字段供 INTERNAL_REF 下拉使用。
 */
export function NodeInputFields({ name, nodeId }: node_input_fields_props) {
    const form = Form.useFormInstance();
    const { state } = useWorkflowState();

    const internal_ref_options: internal_ref_option[] = nodeId
        ? compute_internal_ref_options(nodeId, state.graph.nodes, state.graph.edges)
        : [];

    useEffect(() => {
        if (!form) return;
        const inputs = form.getFieldValue(name) as node_input_field_definition[] | undefined;
        if (!inputs) return;

        const { changed, result } = ensure_ids(inputs);
        if (changed) {
            form.setFieldsValue({ [String(name)]: result });
        }
    }, [form, name]);

    return (
        <Form.List name={name}>
            {(fields, { add, remove }) => (
                <>
                    {fields.map(({ key, name: field_name }) => (
                        <Flex key={key} gap={6} align="flex-start">
                            <NodeFieldItem
                                name={[field_name]}
                                style={{ marginBottom: 6 }}
                                help=""
                                internal_ref_options={internal_ref_options}
                            />
                            <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => remove(field_name)}
                            />
                        </Flex>
                    ))}
                    <Button
                        block
                        icon={<PlusOutlined />}
                        style={{ marginTop: 6 }}
                        onClick={() => add(node_field_definition_support.getDefaultDefinition())}
                    >
                        添加输入字段
                    </Button>
                </>
            )}
        </Form.List>
    );
}
