import { Form, type FormItemProps } from 'antd';
import { NodeField, type node_field_props } from './node-field.tsx';

/**
 * node_field_item Props：透传 node_field 的配置，其余透传给 Form.Item。
 */
export interface node_field_item_props
    extends Omit<node_field_props, 'value' | 'onChange'>,
        Omit<FormItemProps, 'rules'> {}

/**
 * 节点字段行内编辑（别名 + 类型 + 值），作为 Form.Item 的包装用于 Form.List。
 */
export function NodeFieldItem(props: node_field_item_props) {
    const {
        disableAlias,
        disableType,
        aliasPlaceholder,
        valuePlaceholder,
        disabled,
        internal_ref_options,
        reverse,
        name,
        required,
        help,
        tooltip,
        ...rest_form_item_props
    } = props;

    const field_props = {
        disableAlias,
        disableType,
        aliasPlaceholder,
        valuePlaceholder,
        disabled,
        internal_ref_options,
        reverse,
    };

    return (
        <Form.Item
            name={name}
            required={required}
            help={help}
            tooltip={tooltip}
            {...rest_form_item_props}
        >
            <NodeField {...field_props} />
        </Form.Item>
    );
}
