import { useState } from 'react';
import { Button } from 'antd';
import { DownOutlined, UpOutlined, CloseOutlined, CopyOutlined } from '@ant-design/icons';
import { MonacoBody } from '@/components/monaco-code-editor';
import { useRunResultContext } from './run-result-context';
import styles from './status.module.css';

/**
 * NodeResult Props。
 */
export interface node_result_props {
    /** 宿主节点 id（用于将本节点的运行结果置顶）。 */
    nodeId: string;
    output: Record<string, unknown>;
    /** 节点解析后的输入快照（运行时真实消费值），无可展示时占位 {}。 */
    input?: unknown;
    /** 节点运行耗时（ms）。 */
    duration?: number;
    /** 节点显示名（用于结果卡片标题）。 */
    nodeLabel?: string;
    /** 失败信息；存在时结果卡片显示「异常描述」（用户可读 message）与「技术详情」（detail）区。 */
    error?: {
        message?: string;
        detail?: string;
    };
}

const CONTENT_LANGUAGE = 'json' as const;

/**
 * 运行结果编辑器字号：比默认（14）小，便于在有限面板内展示更多内容。
 */
const RESULT_EDITOR_FONT_SIZE = 12;

/**
 * 节点运行结果卡片（参考行业 UI）：在节点下方渲染为一条更宽的结果面板，底色不透明。
 * 折叠态为一条扁平的「展开结果」按钮；展开后为面板——标题 + 输入/输出只读 code 编辑器（行号/语法高亮，可框选 Ctrl+C）+ tokens/耗时统计。
 * 点击阻止冒泡，避免触发节点拖拽/选中；根节点挂载 React Flow 的 nodrag 类，
 * 使其不参与节点拖拽（以便框选复制其中文本），展开/收起时把本节点运行结果置顶到其它节点之上。
 */
export default function NodeResult({ nodeId, output, input, duration, nodeLabel, error }: node_result_props) {
    const [is_expanded, set_is_expanded] = useState(false);
    const { activate_node } = useRunResultContext();

    const has_error = !!error?.message;
    const output_text = JSON.stringify(output, null, 2);
    const has_input = Array.isArray(input)
        ? input.length > 0
        : (input !== null && input !== undefined && Object.keys(input as object).length > 0);
    const input_text = has_input ? JSON.stringify(input, null, 2) : '{}';
    const title = nodeLabel
        ? (has_error ? `${nodeLabel} 运行失败` : `${nodeLabel} 运行结果`)
        : (has_error ? '运行失败' : '运行结果');
    const duration_text = duration !== undefined ? `${duration} ms` : '-';

    const copy_text = (text: string) => {
        void navigator.clipboard?.writeText(text);
    };

    const toggle_expanded = () => {
        activate_node(nodeId);
        set_is_expanded(!is_expanded);
    };

    return (
        <div
            className={`${styles['node-result']} nodrag`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <button
                className={styles['node-result-toggle']}
                onClick={toggle_expanded}
            >
                <span>{is_expanded ? '收起结果' : '展开结果'}</span>
                {is_expanded ? <UpOutlined /> : <DownOutlined />}
            </button>
            {is_expanded && (
                <div className={styles['node-result-panel']}>
                    <div className={styles['node-result-header']}>
                        <span className={styles['node-result-title']}>{title}</span>
                        <Button
                            type="text"
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={() => set_is_expanded(false)}
                        />
                    </div>

                    {has_error && (
                        <div className={styles['node-result-error']}>
                            <div className={styles['node-result-error-message']}>{error?.message}</div>
                            {error?.detail && (
                                <div className={styles['node-result-error-detail']}>异常详情：{error.detail}</div>
                            )}
                        </div>
                    )}

                    <div className={styles['node-result-section-head']}>
                        <span className={styles['node-result-section-title']}>输入</span>
                        <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copy_text(input_text)} />
                    </div>
                    <div className={styles['node-result-editor']}>
                        <MonacoBody
                            content={input_text}
                            language={CONTENT_LANGUAGE}
                            theme="vs-dark"
                            width="100%"
                            read_only
                            font_size={RESULT_EDITOR_FONT_SIZE}
                            on_content_change={() => undefined}
                            on_mount={() => undefined}
                        />
                    </div>

                    <div className={styles['node-result-section-head']}>
                        <span className={styles['node-result-section-title']}>输出</span>
                        <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copy_text(output_text)} />
                    </div>
                    <div className={styles['node-result-editor']}>
                        <MonacoBody
                            content={output_text}
                            language={CONTENT_LANGUAGE}
                            theme="vs-dark"
                            width="100%"
                            read_only
                            font_size={RESULT_EDITOR_FONT_SIZE}
                            on_content_change={() => undefined}
                            on_mount={() => undefined}
                        />
                    </div>

                    <div className={styles['node-result-stats']}>
                        <span>输入tokens <b>0</b></span>
                        <span>输出tokens <b>0</b></span>
                        <span>总调用tokens <b>0</b></span>
                        <span>运行耗时 <b>{duration_text}</b></span>
                    </div>
                </div>
            )}
        </div>
    );
}
