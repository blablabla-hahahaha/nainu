import type { CSSProperties } from 'react';
import { theme } from 'antd';

/**
 * 二元切换按钮 Props。
 * value / onChange 协议，可直接被 Form.Item 作为受控组件使用。
 */
export interface toggle_props<T = string> {
    value?: T;
    onChange?: (value: T) => void;
    options: { value: T; label: string }[];
    style?: CSSProperties;
    disabled?: boolean;
}

/**
 * 二元切换按钮。
 */
export default function Toggle<T = string>({
    value,
    onChange,
    options,
    style,
    disabled = false,
}: toggle_props<T>) {
    const { token } = theme.useToken();

    const current_index = value === undefined
        ? 0
        : options.findIndex(o => o.value === value);
    const current_label = options[current_index >= 0 ? current_index : 0]?.label ?? '';

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => {
                if (disabled || options.length < 2) return;
                const next_index = current_index < 0
                    ? 0
                    : (current_index + 1) % options.length;
                onChange?.(options[next_index].value);
            }}
            style={{
                width: 32,
                height: 28,
                borderRadius: 6,
                border: `unset`,
                background: `${token.colorPrimary}18`,
                color: token.colorPrimary,
                fontWeight: 600,
                fontSize: 13,
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...style,
            }}
        >
            {current_label}
        </button>
    );
}
