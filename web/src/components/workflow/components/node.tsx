import { HomeOutlined } from '@ant-design/icons';
import type { node_props } from './node-types';
import { useNodeStyles, build_node_style } from './node-types';
import styles from './status.module.css';

/**
 * 工作流节点外壳（Icon + 名称 + 状态）。
 */
export default function Node(props: node_props) {
    const { by_type, token } = useNodeStyles();
    const { children, icon, name, status: externalStatus, data, selected, dragging } = props;

    const node_style = build_node_style(externalStatus, data?.status as typeof externalStatus, by_type, selected, dragging);

    const effective = externalStatus || (data?.status as typeof externalStatus);
    const status_type = effective?.type || 'default';
    const status_style = by_type[status_type];

    return (
        <div className={styles['node-wrapper']}>
            <div className={styles['workflow-node']} style={node_style}>
                <div className={styles['node-header']}>
                    <span className={styles['node-icon-wrap']}>
                        <span className={styles['node-icon-inner']} style={{ color: token.colorPrimary }}>
                            {icon || <HomeOutlined />}
                        </span>
                    </span>
                    <span className={styles['node-name']}>
                        {data?.label?.toString() || name || '未知'}
                    </span>
                    {status_style.icon && (
                        <span
                            className={styles['status-icon']}
                            style={{ color: status_style.color.primary }}
                        >
                            {status_style.icon}
                        </span>
                    )}
                </div>
                {children && (
                    <div className={styles['node-content']}>
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
