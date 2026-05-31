import { useCallback, useMemo } from 'react';
import { Button, Dropdown, type MenuProps } from 'antd';
import { DownOutlined, ArrowsAltOutlined, ShrinkOutlined } from '@ant-design/icons';
import type { monaco_code_editor_language, language_options } from './monaco-code-editor';
import styles from './monaco-code-editor.module.css';

/**
 * 类型守卫：判断字符串是否为合法的 monaco_code_editor_language。
 */
function is_monaco_language(key: string): key is monaco_code_editor_language {
    return ['json', 'python', 'javascript'].includes(key);
}

/**
 * MonacoHeader 组件属性。
 */
export interface monaco_header_props {
    /**
     * 当前选中的语言
     */
    language: monaco_code_editor_language;
    /**
     * 可选语言下拉列表
     */
    language_options: language_options;
    /**
     * 是否全屏状态
     */
    is_full_screen: boolean;
    /**
     * 语言切换回调
     */
    on_language_change: (language: monaco_code_editor_language) => void;
    /**
     * 全屏切换回调
     */
    on_toggle_full_screen: () => void;
    /**
     * Dropdown 弹出菜单的挂载容器。
     * 默认渲染到 document.body，全屏时必须指定全屏容器内的元素，
     * 否则浏览器会阻断 popup 显示。
     */
    get_popup_container?: () => HTMLElement;
}

/**
 * MonacoCodeEditor 的顶部 Header 区域：语言下拉选择 + 全屏切换按钮。
 */
export default function MonacoHeader({
    language,
    language_options: options,
    is_full_screen,
    on_language_change,
    on_toggle_full_screen,
    get_popup_container,
}: monaco_header_props) {
    // 当前语言对应展示标签
    const current_label = useMemo(
        () => options.find((opt) => opt.key === language)?.label ?? language,
        [options, language],
    );

    // 语言下拉菜单点击
    const handle_menu_click: NonNullable<MenuProps['onClick']> = useCallback(
        ({ key }) => {
            if (is_monaco_language(key)) {
                on_language_change(key);
            }
        },
        [on_language_change],
    );

    // 下拉选项转换
    const menu_items = useMemo(
        () => options.map((opt) => ({ key: opt.key, label: opt.label })),
        [options],
    );

    return (
        <div className={styles['monaco-code-editor-header']}>
            <div className={styles['monaco-code-editor-header-left']}>
                <Dropdown
                    menu={{ items: menu_items, onClick: handle_menu_click, selectedKeys: [language] }}
                    trigger={['click']}
                    getPopupContainer={get_popup_container}
                >
                    <Button color="default" variant="text" size="small" style={{ color: '#ffffff', fontWeight: 'bold' }}>
                        {current_label}
                        <DownOutlined />
                    </Button>
                </Dropdown>
            </div>
            <div className={styles['monaco-code-editor-header-right']}>
                <Button
                    color="default"
                    variant="text"
                    icon={is_full_screen ? <ShrinkOutlined /> : <ArrowsAltOutlined />}
                    onClick={on_toggle_full_screen}
                    style={{ color: '#ffffff' }}
                ></Button>
            </div>
        </div>
    );
}
