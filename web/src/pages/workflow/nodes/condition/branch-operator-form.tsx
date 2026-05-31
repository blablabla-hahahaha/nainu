/**
 * 单条分支（IF / ELIF）的表单组件。
 * 管理一组 compare 条件和 AND/OR 逻辑切换。
 */
import {Button, Flex, Form, Select, Typography} from 'antd';
import { PlusCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import Toggle from '@/components/toggle';
import {
    type branch_type,
    compare_operator_definition_support,
    branch_operator_definition_support,
} from './condition-operator';
import { CompareOperatorForm } from './compare-operator-form';

/**
 * BranchOperatorForm 的 props。
 */
export interface branch_operator_form_props {
    name: number;
    branch: branch_type;
    onRemove?: () => void;
}

/**
 * 渲染一条分支的表单：分支标签 + 逻辑切换按钮 + 多条 compare 条件 + 增删按钮。
 */
export function BranchOperatorForm({ name, branch, onRemove }: branch_operator_form_props) {
    const form = Form.useFormInstance();
    const compares_path = ['branches', name, 'compares'] as (string | number)[];

    return (
        <Form.Item shouldUpdate={() => true} noStyle>
            {() => {
                const compares = form.getFieldValue(compares_path) || [];
                const has_multiple = compares.length > 1;

                return (
                    <Flex vertical>
                        <Form.Item name={[name, 'type']} hidden>
                            <Select<branch_type> />
                        </Form.Item>
                        <Flex>
                            <Flex vertical justify="center" style={{ width: '50px', alignSelf: 'stretch', position: 'relative' }}>
                                <Typography.Text strong style={{ fontSize: 15, position: 'absolute', top: 2 }}>
                                    {branch}
                                </Typography.Text>
                                {has_multiple && (
                                    <Form.Item name={[name, 'logic']} noStyle hasFeedback={false}>
                                        <Toggle options={branch_operator_definition_support.getLogicOptions()} />
                                    </Form.Item>
                                )}
                            </Flex>
                            <Flex vertical>
                                <Form.List name={[name, 'compares']}>
                                    {(compares, { remove }) => compares.map(({ key, name: compare_name }, compare_index) => (
                                        <div key={key} style={{ marginBottom: 8 }}>
                                            <CompareOperatorForm
                                                name={compare_name}
                                                paths={compares_path}
                                                removable={compares.length > 1}
                                                onRemove={() => remove(compare_index)}
                                            />
                                        </div>
                                    ))}
                                </Form.List>
                            </Flex>
                        </Flex>
                        <Flex gap={48} style={{ paddingLeft: '50px' }}>
                            <Button
                                type="dashed"
                                block
                                icon={<PlusCircleOutlined />}
                                onClick={() => {
                                    const current_compares = form.getFieldValue(compares_path) || [];
                                    form.setFieldValue(compares_path, [
                                        ...current_compares,
                                        compare_operator_definition_support.getDefaultDefinition(),
                                    ]);
                                }}
                                style={{ marginTop: 8 }}
                            >
                                添加条件
                            </Button>
                            {branch === 'ELIF' && (
                                <Button
                                    type="dashed"
                                    block
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={onRemove}
                                    style={{ marginTop: 8 }}
                                >
                                    移除分支
                                </Button>
                            )}
                        </Flex>
                    </Flex>
                );
            }}
        </Form.Item>
    );
}
