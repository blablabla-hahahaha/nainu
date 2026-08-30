import { Select, Input } from 'antd';
import {
    node_field_definition_support,
    type node_field_definition,
    type node_field_type,
    type internal_ref_option,
} from './node-field.ts';

/**
 * node_field 组件的 props。
 */
export interface node_field_props {
    value?: node_field_definition;
    onChange?: (v: node_field_definition) => void;
    disableAlias?: boolean;
    disableType?: boolean;
    aliasPlaceholder?: string;
    valuePlaceholder?: string;
    disabled?: boolean;
    internal_ref_options?: internal_ref_option[];
    reverse?: boolean;
    syncAliasToValue?: boolean;
}

/**
 * 节点字段可配置行（别名输入 + 类型选择 + 值输入）。
 * 支持通过 disableType 控制是否显示类型选择器。
 */
export function NodeField({
    value = { alias: '', type: 'CUSTOM' as node_field_type, value: '' },
    onChange,
    disableAlias = false,
    disableType = false,
    aliasPlaceholder = '别名',
    valuePlaceholder = '请输入值',
    disabled = false,
    internal_ref_options,
    reverse = false,
    syncAliasToValue = false,
}: node_field_props) {
    const handle_alias_change = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.({ ...value, alias: e.target.value, value: value.value });
    };

    const handle_type_change = (new_type: node_field_type) => {
        onChange?.({ ...value, type: new_type, value: value.value });
    };

    const handle_value_change = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = { ...value, value: e.target.value };
        // 便捷交互：输出字段填了 key 且别名为空时，自动把 key 同步为别名。
        if (syncAliasToValue && !next.alias) {
            next.alias = e.target.value;
        }
        onChange?.(next);
    };

    const handle_upstream_output_change = (new_value: string | undefined, option?: internal_ref_option | internal_ref_option[]) => {
        const next = { ...value, value: new_value ?? '' };
        // 选中内部引用后把字段别名同步为引用名，使落库的 key 语义化而非随机串。
        const selected = Array.isArray(option) ? option[0] : option;
        if (selected?.ref_name) {
            next.alias = selected.ref_name;
        }
        onChange?.(next);
    };

    const should_show_upstream_select = value.type === 'INTERNAL_REF'
        && internal_ref_options
        && internal_ref_options.length > 0;

    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!reverse && !disableAlias && (
                <Input
                    value={value.alias}
                    onChange={handle_alias_change}
                    placeholder={aliasPlaceholder}
                    disabled={disabled}
                    style={{ flex: 1 }}
                />
            )}
            {!disableType && (
                <Select<node_field_type>
                    value={value.type}
                    onChange={handle_type_change}
                    options={node_field_definition_support.getOptions()}
                    disabled={disabled}
                    style={{ width: 100 }}
                />
            )}
            {should_show_upstream_select ? (
                <Select
                    value={value.value || undefined}
                    onChange={handle_upstream_output_change}
                    options={internal_ref_options}
                    placeholder="请选择上游输出"
                    disabled={disabled}
                    style={{ flex: 1 }}
                    allowClear
                />
            ) : (
                <Input
                    value={value.value}
                    onChange={handle_value_change}
                    placeholder={valuePlaceholder}
                    disabled={disabled}
                    style={{ flex: 1 }}
                />
            )}
            {reverse && !disableAlias && (
                <Input
                    value={value.alias}
                    onChange={handle_alias_change}
                    placeholder={aliasPlaceholder}
                    disabled={disabled}
                    style={{ flex: 1 }}
                />
            )}
        </div>
    );
}
