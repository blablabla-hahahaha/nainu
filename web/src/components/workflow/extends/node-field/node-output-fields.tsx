import { useEffect } from 'react';
import { Button, Flex, Form } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { NodeFieldItem } from "./node-field-item";
import { short_uuid } from '@/utils/id-gen';
import { with_id, ensure_ids } from "./node-field";
import type { node_output_field_definition } from "./node-field";

/**
 * node_output_fields Props：接收 Form.List 的 name。
 */
export interface node_output_fields_props {
    name: string | number | (string | number)[];
}

/**
 * Form.List 封装的输出字段列表（两列 alias + value，不带 type）。
 */
export function NodeOutputFields({ name }: node_output_fields_props) {
    const form = Form.useFormInstance();

    useEffect(() => {
        if (!form) return;
        const outputs = form.getFieldValue(name) as node_output_field_definition[] | undefined;
        if (!outputs) return;

        const { changed, result } = ensure_ids(outputs);
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
                                disableType
                                help=""
                                reverse={true}
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
                        onClick={() => add(with_id<node_output_field_definition>({ alias: short_uuid(), value: '' }))}
                    >
                        添加输出字段
                    </Button>
                </>
            )}
        </Form.List>
    );
}
