/**
 * Condition 节点配置面板：读 canonical 出边（typed conditional edge），
 * 编辑经 dispatch graph/set_condition_edges 落 DSL（受控）。
 */

import {Button, Form, theme} from 'antd';
import {PlusOutlined} from '@ant-design/icons';
import {useMemo} from 'react';
import {type node_settings_props, NodeSetting} from '@/components/workflow/components/node-setting';
import {
    type branch_operator_definition,
    branch_operator_definition_support,
    condition_to_branch,
    branch_to_condition,
} from './condition-operator';
import {BranchOperatorForm} from './branch-operator-form';
import {uuid} from '@/utils/id-gen';
import {useWorkflowState} from '@/components/workflow/graph';
import {
    compute_internal_ref_options,
    type internal_ref_option,
} from '@/components/workflow/extends/node-field/node-field';

/**
 * 条件分支节点 Settings 面板（分支列表 + IF/ELIF/ELSE 增删，落 canonical 边）。
 */
export default function ConditionSettings({ nodeId, onClose }: node_settings_props) {
    const [form] = Form.useForm();
    const { token } = theme.useToken();
    const { state, dispatch } = useWorkflowState();

    const internal_ref_options: internal_ref_option[] = useMemo(
        () => compute_internal_ref_options(nodeId, state.graph.nodes, state.graph.edges),
        [nodeId, state.graph.nodes, state.graph.edges],
    );

    const sourceEdges = state.graph.edges.filter(e => e.source === nodeId && e.condition);

    const refresh_branches = (branches: branch_operator_definition[]) => {
        const ensured = branch_operator_definition_support.ensureComplete(branches);
        // IF/ELIF 分支必须至少携带一条 compare，否则后端会校验失败（「IF 分支必须携带逻辑表达式」）。
        // 编辑期间表单可能短暂产出无 compare 的分支；此处归一化，避免把非法条件写进 DSL。
        const safe = ensured.map((branch) => {
            if (branch.type === 'ELSE' || (branch.compares && branch.compares.length > 0)) {
                return branch;
            }
            return branch.type === 'IF'
                ? branch_operator_definition_support.getIfDefinition()
                : branch_operator_definition_support.getElifBranchDefinition();
        });
        dispatch({
            type: 'graph/set_condition_edges',
            source: nodeId,
            edges: safe.map((branch, index) => {
                const existing = sourceEdges[index];
                const edgeId = existing?.id || uuid();
                return {
                    id: edgeId,
                    source: nodeId,
                    sourceHandle: existing?.sourceHandle ?? edgeId,
                    target: existing?.target ?? '',
                    condition: branch_to_condition(branch),
                };
            }),
        });
    };

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
                    refresh_branches(allValues?.branches ?? []);
                }}
                initialValues={{
                    branches: sourceEdges.map(e => condition_to_branch(e.condition!)),
                }}
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
                                            internal_ref_options={internal_ref_options}
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
                                        refresh_branches(newBranches);
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
