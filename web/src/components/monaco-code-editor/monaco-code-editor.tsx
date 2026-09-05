import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { type Monaco, type OnMount } from '@monaco-editor/react';
import { theme } from 'antd';
import MonacoHeader from './monaco-header';
import MonacoBody from './monaco-body';
import MonacoFooter from './monaco-footer';
import styles from './monaco-code-editor.module.css';

/**
 * MonacoCodeEditor 支持的语言字面量。
 */
export type monaco_code_editor_language = 'json' | 'python' | 'javascript';

/**
 * MonacoCodeEditor 支持的主题字面量。
 */
export type monaco_code_editor_theme = 'vs-dark' | 'vs';

/**
 * MonacoCodeEditor 下拉菜单中的单个语言选项。
 *
 * key 必须与 monaco_code_editor_language 对齐，保证 Dropdown 选中后
 * 能安全地驱动 Editor 的 language。
 */
export interface monaco_code_editor_language_option {
    key: monaco_code_editor_language;
    label: string;
}

/**
 * MonacoCodeEditor 下拉菜单可用的语言选项集合。
 */
export type language_options = monaco_code_editor_language_option[];

/**
 * 默认下拉语言选项：Python + JavaScript。
 */
const default_language_options: language_options = [
    { key: 'python', label: 'Python' },
    { key: 'javascript', label: 'JavaScript' },
];

/**
 * MonacoCodeEditor 组件属性。
 */
export interface monaco_code_editor_props {
    /**
     * 编辑器内容（受控模式使用）
     */
    content?: string;
    /**
     * 内容变化回调（受控模式使用）
     */
    on_content_change?: (content: string) => void;
    /**
     * 编辑器语言
     */
    language?: monaco_code_editor_language;
    /**
     * 编辑器主题
     */
    theme?: monaco_code_editor_theme;
    /**
     * 编辑器宽度
     */
    width?: CSSProperties['width'];
    /**
     * 是否只读
     */
    read_only?: boolean;
    /**
     * 下拉菜单展示的语言选项集合。
     * 不传则使用 default_language_options（Python + JavaScript）。
     */
    language_options?: language_options;
    /**
     * 用户在下拉菜单中选择某项语言时回调。
     * 父级应将新语言同步回 language prop 以驱动 Editor。
     */
    on_language_change?: (language: monaco_code_editor_language) => void;
}

/**
 * 从 @monaco-editor/react 的 OnMount 提取的 editor 类型
 * （即 monaco-editor 的 editor.IStandaloneCodeEditor）。
 */
type code_editor = Parameters<OnMount>[0];

const FIND_ACTION_ID = 'monaco-code-editor.disable-find';

/**
 * 编辑器默认高度（非全屏时）。
 */
const DEFAULT_EDITOR_HEIGHT = 300;

/**
 * 编辑器最小高度。
 */
const MIN_EDITOR_HEIGHT = 150;

/**
 * 编辑器最大高度。
 */
const MAX_EDITOR_HEIGHT = 800;

/**
 * 基于 @monaco-editor/react 的代码编辑器组件。
 *
 * 支持三区域布局（header → body → footer）：
 * - header：语言下拉选择 + 全屏切换按钮
 * - body：代码编辑器实例
 * - footer：可拖拽的 resize handle
 */
export default function MonacoCodeEditor({
    content: content_prop = '',
    on_content_change,
    language: language_prop = 'python',
    theme: editor_theme = 'vs-dark',
    width = '100%',
    read_only = false,
    language_options = default_language_options,
    on_language_change,
}: monaco_code_editor_props) {
    // --- 全屏状态 ---
    const [is_full_screen, set_is_full_screen] = useState(false);
    const container_ref = useRef<HTMLDivElement>(null);

    // --- 拖拽状态 ---
    const [editor_body_height, set_editor_body_height] = useState(DEFAULT_EDITOR_HEIGHT);
    const is_dragging_ref = useRef(false);
    const drag_start_y_ref = useRef(0);
    const drag_start_height_ref = useRef(0);

    // --- 内部语言状态（半受控：外部 prop 变化时同步，用户选择时立即更新） ---
    const [language, set_language] = useState(language_prop);
    useEffect(() => {
        set_language(language_prop);
    }, [language_prop]);

    // --- 主题 Token ---
    const { token } = theme.useToken();

    // --- 侦听全屏变化事件 ---
    useEffect(() => {
        const handle_full_screen_change = () => {
            set_is_full_screen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handle_full_screen_change);
        return () => {
            document.removeEventListener('fullscreenchange', handle_full_screen_change);
        };
    }, []);

    // --- Editor mount ---
    const handle_on_mount = useCallback((editor: code_editor, monaco: Monaco) => {
        editor.addAction({
            id: FIND_ACTION_ID,
            label: 'Find',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
            run: () => undefined,
        });
        // 不要在挂载时抢焦点：设置面板常驻 Monaco（指定输出/编码脚本），
        // 挂载即 editor.focus() 会把焦点从画布抢走，使选中节点后按 Delete/Backspace 落到编辑器而非画布，
        // 节点删不掉。用户在编辑器内点击后仍会自动聚焦，不影响正常输入。
    }, []);

    // --- 内容变化处理 ---
    const handle_content_change = useCallback(
        (next: string) => {
            on_content_change?.(next);
        },
        [on_content_change],
    );

    // --- 语言变化处理 ---
    const handle_language_change = useCallback(
        (lang: monaco_code_editor_language) => {
            set_language(lang);
            on_language_change?.(lang);
        },
        [on_language_change],
    );

    // --- 全屏切换 ---
    const toggle_full_screen = useCallback(() => {
        if (is_full_screen) {
            void document.exitFullscreen();
        } else if (container_ref.current) {
            void container_ref.current.requestFullscreen();
        }
    }, [is_full_screen]);

    // --- Footer 拖拽开始 ---
    const handle_footer_mouse_down = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            is_dragging_ref.current = true;
            drag_start_y_ref.current = e.clientY;
            drag_start_height_ref.current = editor_body_height;

            const handle_mouse_move = (move_e: MouseEvent) => {
                if (!is_dragging_ref.current) return;
                const delta = move_e.clientY - drag_start_y_ref.current;
                const new_height = Math.max(
                    MIN_EDITOR_HEIGHT,
                    Math.min(MAX_EDITOR_HEIGHT, drag_start_height_ref.current + delta),
                );
                set_editor_body_height(new_height);
            };

            const handle_mouse_up = () => {
                is_dragging_ref.current = false;
                document.removeEventListener('mousemove', handle_mouse_move);
                document.removeEventListener('mouseup', handle_mouse_up);
            };

            document.addEventListener('mousemove', handle_mouse_move);
            document.addEventListener('mouseup', handle_mouse_up);
        },
        [editor_body_height],
    );

    // --- 容器样式 ---
    const container_style = {
        '--border-color': token.colorBorder,
    } as CSSProperties & Record<string, string>;

    // --- 编辑器容器 div 高度 ---
    const editor_wrapper_style: CSSProperties = is_full_screen
        ? { flex: 1, minHeight: 0 }
        : { height: editor_body_height };

    return (
        <div
            ref={container_ref}
            className={`${styles['monaco-code-editor']}${is_full_screen ? ` ${styles['is-full-screen']}` : ''}`}
            style={container_style}
        >
            <MonacoHeader
                language={language}
                language_options={language_options}
                is_full_screen={is_full_screen}
                on_language_change={handle_language_change}
                on_toggle_full_screen={toggle_full_screen}
                get_popup_container={() => container_ref.current ?? document.body}
            />
            <div className={styles['monaco-code-editor-body']} style={editor_wrapper_style}>
                <MonacoBody
                    content={content_prop}
                    language={language}
                    theme={editor_theme}
                    width={width}
                    read_only={read_only}
                    on_content_change={handle_content_change}
                    on_mount={handle_on_mount}
                />
            </div>
            <MonacoFooter on_mouse_down={handle_footer_mouse_down} />
        </div>
    );
}
