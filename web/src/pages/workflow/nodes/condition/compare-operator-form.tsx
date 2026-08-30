/**
 * 单条 compare 条件的表单组件。
 */

import { Button, Card, Flex, Form, Select } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { NodeFieldItem } from '@/components/workflow/extends/node-field/node-field-item';
import type { internal_ref_option } from '@/components/workflow/extends/node-field/node-field';
import {
    type compare_type,
    compare_operator_definition_support,
} from './condition-operator';

/**
 * CompareOperatorForm 的 props。
 */
export interface compare_operator_form_props {
    name: number;
    paths: (string | number)[];
    removable?: boolean;
    onRemove?: () => void;
    internal_ref_options?: internal_ref_option[];
}

/**
 * 渲染一行 compare 条件：字段选择 + 运算符选择 + 可选的对比值。
 */
export function CompareOperatorForm(props: compare_operator_form_props) {
    const { name, paths, removable, onRemove, internal_ref_options } = props;
    const selected_compare_type = Form.useWatch([...paths, 'type']) as compare_type;

    return (
        <Card
            size="small"
            style={{ marginBottom: 0 }}
            styles={{ body: { padding: '8px 10px' } }}
        >
            <Flex gap={6}>
                <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
                        <NodeFieldItem
                            name={[name, 'field']}
                            style={{ flex: 1, marginBottom: 0 }}
                            help=""
                            disableAlias
                            internal_ref_options={internal_ref_options}
                        />
                        <Form.Item
                            name={[name, 'type']}
                            style={{ marginBottom: 0, width: 80 }}
                            help=""
                        >
                            <Select<compare_type> options={compare_operator_definition_support.getOptions()} />
                        </Form.Item>
                    </div>

                    {compare_operator_definition_support.isValueRequired(selected_compare_type) && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                            <NodeFieldItem
                                name={[name, 'value']}
                                style={{ flex: 1, marginBottom: 0 }}
                                help=""
                                disableAlias
                                internal_ref_options={internal_ref_options}
                            />
                        </div>
                    )}
                </Flex>
                <Button
                    type="text"
                    danger
                    size="small"
                    disabled={!removable}
                    icon={<DeleteOutlined />}
                    onClick={onRemove}
                />
            </Flex>
        </Card>
    );
}
