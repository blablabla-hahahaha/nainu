import {
    type compare_operator_definition,
    compare_operator_definition_support,
} from './condition-operator';
import { internal_ref_label } from '@/components/workflow/extends/node-field/node-field';
import { theme } from "antd";

/**
 * CompareOperatorView Props。
 */
export interface compare_operator_view_props {
    compare: compare_operator_definition
    /** 节点 id → 显示名，用于把 INTERNAL_REF 引用解析为可读标签。 */
    node_labels?: ReadonlyMap<string, string>;
}

/**
 * 单条 compare 条件迷你视图。
 */
export default function CompareOperatorView({ compare, node_labels }: compare_operator_view_props) {
    const { token } = theme.useToken();
    const is_internal_ref = compare.field.type === 'INTERNAL_REF';
    const field = is_internal_ref && compare.field.value
        ? internal_ref_label(compare.field.value, node_labels ?? new Map())
        : compare_operator_definition_support.stringifyField(compare.field);
    const value = compare_operator_definition_support.stringifyField(compare.value);
    const type = compare_operator_definition_support.getLabel(compare.type);

    return (
        <div>
            {field.length > 0 && (
                <span style={{
                    fontSize: 8,
                    fontWeight: 600,
                    borderRadius: 2,
                    padding: '0 4px',
                    color: token.colorPrimary,
                    background: `${token.colorPrimary}18`,
                    marginRight: 2
                }}>
                    {field}
                </span>
            )}
            <span>{type}</span>
            {value.length > 0 && (
                <span style={{
                    fontSize: 8,
                    fontWeight: 600,
                    borderRadius: 2,
                    padding: '0 4px',
                    color: token.colorPrimary,
                    background: `${token.colorPrimary}18`,
                    marginLeft: 2
                }}>
                    {value}
                </span>
            )}
        </div>
    );
}
