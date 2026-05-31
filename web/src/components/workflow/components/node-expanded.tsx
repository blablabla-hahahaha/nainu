import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { theme } from 'antd';
import { create_node_status_styles } from './status';
import type { node_status } from './status';
import styles from './status.module.css';

/**
 * NodeExpanded Props。
 */
export interface node_expanded_props {
    status?: node_status;
    input?: React.ReactNode;
    output?: React.ReactNode;
}

/**
 * 节点展开详情面板。
 */
export default function NodeExpanded(props: node_expanded_props) {
    const { token } = theme.useToken();
    const { status, input, output } = props;
    const [isExpanded, setIsExpanded] = useState(false);

    const status_type = status?.type || 'default';
    const status_styles = create_node_status_styles(token);
    const status_style = status_styles[status_type];
    const default_status_style = status_styles['default'];
    const message = status?.message;

    const has_content = message || input || output;

    return (
        <div onClick={(e) => e.stopPropagation()}>
            {has_content && (
                <div
                    className={styles['node-expanded-toggle']}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                >
                    <span>{isExpanded ? '收起详情' : '展开详情'}</span>
                    {isExpanded ? <UpOutlined /> : <DownOutlined />}
                </div>
            )}

            {has_content && isExpanded && (
                <div
                    className={styles['node-expanded-panel']}
                    style={{
                        color: default_status_style.color.text,
                        backgroundColor: default_status_style.color.background,
                        border: `${default_status_style.borderWidth}px ${default_status_style.borderStyle} ${default_status_style.color.border}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={styles['node-expanded-title']}>执行信息</div>

                    {message && (
                        <div
                            className={styles['node-expanded-message']}
                            style={{
                                color: status_style.color.text,
                                backgroundColor: status_style.color.background,
                            }}
                        >{message}</div>
                    )}

                    <div className={styles['node-expanded-section']} style={{ marginBottom: output ? '16px' : 0 }}>
                        <div className={styles['section-title']}>输入</div>
                        <div className={styles['section-content']}>暂无输入数据</div>
                    </div>

                    <div className={styles['node-expanded-section']}>
                        <div className={styles['section-title']}>输出</div>
                        <div className={styles['section-content']}>暂无输出数据</div>
                    </div>
                </div>
            )}
        </div>
    );
}
