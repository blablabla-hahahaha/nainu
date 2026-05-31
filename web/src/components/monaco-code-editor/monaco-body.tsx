import { useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Editor, type Monaco, type OnMount } from '@monaco-editor/react';
import type { monaco_code_editor_language, monaco_code_editor_theme } from './monaco-code-editor';

/**
 * 从 @monaco-editor/react 的 OnMount 提取的 editor 类型
 * （即 monaco-editor 的 editor.IStandaloneCodeEditor）。
 */
type code_editor = Parameters<OnMount>[0];

/**
 * MonacoBody 组件属性。
 */
export interface monaco_body_props {
    /**
     * 编辑器内容
     */
    content: string;
    /**
     * 编辑器语言
     */
    language: monaco_code_editor_language;
    /**
     * 编辑器主题
     */
    theme: monaco_code_editor_theme;
    /**
     * 编辑器宽度
     */
    width: CSSProperties['width'];
    /**
     * 是否只读
     */
    read_only: boolean;
    /**
     * 内容变化回调
     */
    on_content_change: (content: string) => void;
    /**
     * Editor mount 回调
     */
    on_mount: (editor: code_editor, monaco: Monaco) => void;
}

/**
 * MonacoCodeEditor 的 Body 区域：Monaco Editor 实例。
 */
export default function MonacoBody({
    content,
    language,
    theme,
    width,
    read_only,
    on_content_change,
    on_mount,
}: monaco_body_props) {
    const handle_change = useCallback(
        (next: string | undefined) => {
            on_content_change(next ?? '');
        },
        [on_content_change],
    );

    const editor_options = useMemo(
        () => ({
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            glyphMargin: false,
            lineNumbersMinChars: 2,
            snippetSuggestions: 'none' as const,
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            parameterHints: { enabled: false },
            find: {
                autoFindInSelection: 'never' as const,
                seedSearchStringFromSelection: 'never' as const,
            },
            formatOnPaste: true,
            ariaLabel: '代码编辑器',
            readOnly: read_only,
        }),
        [read_only],
    );

    return (
        <Editor
            value={content}
            language={language}
            theme={theme}
            height="100%"
            width={width}
            onMount={on_mount}
            onChange={handle_change}
            options={editor_options}
            loading="编辑器加载中…"
        />
    );
}
