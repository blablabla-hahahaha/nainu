/**
 * Condition 节点的配置面板组件。
 * 负责条件分支的增删改和表单同步。
 */

import {Button, Form, theme} from 'antd';
import {PlusOutlined} from '@ant-design/icons';
import {type node_settings_props, NodeSetting} from '@/components/workflow/components/node-setting';
import {type branch_operator_definition, branch_operator_definition_support,} from './condition-operator';
import {BranchOperatorForm} from './branch-operator-form';
import {uuid} from '@/utils/id-gen';
import {useReactFlow, useNodes, useEdges} from '@xyflow/react';
import type {graph_edge} from '@/components/workflow/graph/types';

/**
 * 条件分支节点 Settings 面板（分支列表 + IF/ELIF/ELSE 增删）。
 */
export default function ConditionSettings({ nodeId, onClose }: node_settings_props) {
    const [form] = Form.useForm();
    const { token } = theme.useToken();
    const reactFlow = useReactFlow();
    const nodes = useNodes();
    const edges = useEdges();

    const currentNode = nodes.find(n => n.id === nodeId);
    const sourceEdges = edges.filter(e => e.source === currentNode?.id);

    const initialValues = sourceEdges.map(edge => {
        const edgeData = (edge.data ?? {}) as Record<string, unknown>;
        if (edgeData.type === undefined && edgeData.branchType === undefined) {
            return null;
        }
        return branch_operator_definition_support.normalize(edge.data);
    }).filter((b): b is branch_operator_definition => b !== null)

    const refreshBranches = (branches: branch_operator_definition[]) => {
        reactFlow.setEdges((eds) => {
            // 如果 branch 不存在 else，则添加
            const else_branch = branches?.find(b => b.type === branch_operator_definition_support.BRANCH.ELSE);
            if (!else_branch) {
                branches?.push(branch_operator_definition_support.getElseBranchDefinition());
            }

            const otherEdges = eds.filter(e => e.source !== currentNode?.id);
            const sourceEdges = edges.filter(e => e.source === currentNode?.id);
            const newEdges = branches.map<graph_edge>((branch, index) => {
                const existing = sourceEdges[index];
                const edgeId = existing?.id || uuid();
                return {
                    id: edgeId,
                    source: currentNode!.id,
                    sourceHandle: edgeId,
                    target: existing?.target || '',
                    targetHandle: existing?.targetHandle ?? '',
                    type: 'edge',
                    data: branch,
                };
            });

            return [...otherEdges, ...newEdges];
        });
    }

    return (
        <NodeSetting
            nodeId={nodeId}
            onClose={onClose}
            onValidate={() => {
                const { branches } = form.getFieldsValue();
                if (!Array.isArray(branches) || branches.length < 2) {
                    return '至少需要 IF 和 ELSE 两个分支';
                }
                return null;
            }}
        >
            <Form<{ branches: branch_operator_definition[] }>
                form={form}
                layout="vertical"
                onValuesChange={(_, allValues) => {
                    refreshBranches(allValues?.branches);
                }}
                initialValues={{ branches: initialValues }}
            >
                <Form.List name="branches">
                    {(logics, { remove }) => {
                        const editable = logics.slice(0, -1);
                        return (
                            <>
                                {editable.map(({ key, name }) => (
                                    <div
                                        key={key}
                                        style={{
                                            marginBottom: 36,
                                            background: token.colorBgContainer,
                                        }}
                                    >
                                        <BranchOperatorForm
                                            name={name}
                                            branch={name === 0 ? 'IF' : 'ELIF'}
                                            onRemove={() => remove(key)}
                                        />
                                    </div>
                                ))}

                                <Button
                                    block
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        const branches = form.getFieldValue('branches') || [];
                                        if (branches.length === 0) return;
                                        const without_else = branches.slice(0, -1);
                                        const else_branch = branches[branches.length - 1];
                                        const newBranches = [
                                            ...without_else,
                                            branch_operator_definition_support.getElifBranchDefinition(),
                                            else_branch,
                                        ]
                                        form.setFieldsValue({ branches: newBranches });
                                        refreshBranches(newBranches);
                                    }}
                                >
                                    添加分支
                                </Button>
                            </>
                        );
                    }}
                </Form.List>
            </Form>
        </NodeSetting>
    );
}
