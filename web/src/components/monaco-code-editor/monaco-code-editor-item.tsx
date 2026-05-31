import { useCallback } from 'react';
import { Form, type FormItemProps } from 'antd';
import MonacoCodeEditor from './monaco-code-editor';
import type { monaco_code_editor_language, monaco_code_editor_props } from './monaco-code-editor';

/**
 * MonacoCodeEditorItem 组件属性。
 *
 * 将 MonacoCodeEditor 包装为 antd Form.Item，自动通过 Form 上下文读写字段值。
 * content 和 language 的值分别绑定到 name 和 language_name 字段上。
 */
export interface monaco_code_editor_item_props
    extends Omit<monaco_code_editor_props, 'content' | 'on_content_change'>,
    Omit<FormItemProps, 'rules'> {
    /**
     * 绑定 Form 的 content 字段名。传入后自动读/写 Form 该字段的值作为编辑器内容。
     */
    name?: string | string[];
    /**
     * 绑定 Form 的 language 字段名。传入后 language 选择结果自动写入 Form 该字段。
     */
    language_name?: string | string[];
}

/**
 * 包装 MonacoCodeEditor 使其适配 antd Form 的表单项组件。
 *
 * 通过 Form.useWatch 监听字段值变化并传递给编辑器 content prop，
 * 编辑器内容变化时通过 form.setFieldValue 写回 Form。
 */
export function MonacoCodeEditorItem(props: monaco_code_editor_item_props) {
    const {
        name,
        language_name,
        language,
        theme,
        width,
        read_only,
        language_options,
        on_language_change,
        required,
        help,
        tooltip,
        ...rest_form_item_props
    } = props;

    const form = Form.useFormInstance();
    const watched = Form.useWatch(name, form);
    const value = typeof watched === 'string' ? watched : '';

    const handle_content_change = useCallback(
        (next: string) => {
            form.setFieldValue(name, next);
        },
        [form, name],
    );

    const handle_language_change = useCallback(
        (lang: monaco_code_editor_language) => {
            if (language_name) {
                form.setFieldValue(language_name, lang);
            }
            on_language_change?.(lang);
        },
        [form, language_name, on_language_change],
    );

    return (
        <Form.Item name={name} required={required} help={help} tooltip={tooltip} {...rest_form_item_props}>
            <MonacoCodeEditor
                content={value}
                language={language}
                theme={theme}
                width={width}
                read_only={read_only}
                language_options={language_options}
                on_content_change={handle_content_change}
                on_language_change={handle_language_change}
            />
        </Form.Item>
    );
}
