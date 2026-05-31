import styles from './monaco-code-editor.module.css';

/**
 * MonacoFooter 组件属性。
 */
export interface monaco_footer_props {
    /**
     * Footer 鼠标按下回调（用于拖拽调整编辑器高度）
     */
    on_mouse_down: (e: React.MouseEvent) => void;
}

/**
 * MonacoCodeEditor 的 Footer 区域：可拖拽的 resize handle。
 */
export default function MonacoFooter({ on_mouse_down }: monaco_footer_props) {
    return (
        <div className={styles['monaco-code-editor-footer']} onMouseDown={on_mouse_down}>
            <div className={styles['monaco-code-editor-resize-indicator']}>
                <div className={styles['monaco-code-editor-resize-line']} />
            </div>
        </div>
    );
}
