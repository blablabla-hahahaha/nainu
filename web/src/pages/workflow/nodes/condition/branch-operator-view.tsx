import {
    type branch_operator_definition,
    branch_operator_definition_support,
} from './condition-operator';
import { Flex, theme } from "antd";
import CompareOperatorView from "@/pages/workflow/nodes/condition/compare-operator-view.tsx";

/**
 * CompareOperatorView 的 props。
 */
export interface branch_operator_view_props {
    branch: branch_operator_definition
    /** 节点 id → 显示名，用于把 INTERNAL_REF 引用解析为可读标签。 */
    node_labels?: ReadonlyMap<string, string>;
}

/**
 * 分支迷你缩略视图（节点卡片内显示）。
 */
export default function BranchOperatorView({ branch, node_labels }: branch_operator_view_props) {
    const { token } = theme.useToken();
    return (
        <Flex align="center" style={{
            fontSize: 8,
            marginTop: 2,
            borderRadius: 4,
            fontWeight: 600,
            lineHeight: '16px',
            padding: '4px 6px',
            color: token.colorText,
            backgroundColor: token.colorBgLayout
        }}>
            <Flex vertical flex={2}>
                {branch.compares?.map((compare, index) => (
                    <CompareOperatorView
                        key={index}
                        compare={compare}
                        node_labels={node_labels}
                    />
                ))}
            </Flex>
            {branch.logic && branch.compares && branch.compares.length > 1 && (
                <div
                    style={{
                        width: 18,
                        height: 16,
                        borderRadius: 4,
                        background: `${token.colorPrimary}18`,
                        color: token.colorPrimary,
                        fontWeight: 600,
                        fontSize: 8,
                        textAlign: 'center',
                    }}
                >
                    {branch_operator_definition_support.getLogicLabel(branch.logic)}
                </div>
            )}
        </Flex>
    );
}
