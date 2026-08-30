import { HomeOutlined } from '@ant-design/icons';
import type { node_props } from './node-types';
import { useNodeStyles, build_node_style } from './node-types';
import { default as NodeResult } from './node-result';
import type { node_runtime_status } from '../graph/types';
import styles from './status.module.css';

/**
 * 工作流节点外壳（Icon + 名称 + 状态图标）。
 * 外壳背景/阴影恒为默认样式；边框颜色随运行状态（有状态时）着色，尺寸不变；
 * 运行状态以标题行右侧、与名称水平对齐的状态图标展示。
 * 待执行（wait）与未启动（default）同视为中性，不显示状态图标/边框；
 * 已成功节点在下方展示可展开的运行结果卡片。
 */
export default function Node(props: node_props) {
    const { by_type, token } = useNodeStyles();
    const { children, icon, name, status: externalStatus, data, selected, dragging } = props;

    const runtime = (data?.status as node_runtime_status | undefined);
    const effective = externalStatus || runtime;
    const status_type = effective?.type || 'default';
    const status_style = by_type[status_type];
    const base = by_type['default'];
    const has_status = status_type !== 'default' && status_type !== 'wait';
    const node_label = data?.label?.toString() || name || '未知';
    const duration = runtime?.duration;

    const border_color = has_status
        ? status_style.color.border
        : (selected && !dragging ? base.color.border : 'transparent');

    const node_style = build_node_style(base, border_color);

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
                        {node_label}
                    </span>
                    {has_status && (
                        <span
                            className={styles['node-status-pill']}
                            style={{ color: status_style.color.primary }}
                        >
                            {status_style.icon}
                            {duration !== undefined && (
                                <span className={styles['node-status-duration']} style={{ color: token.colorTextSecondary }}>
                                    {duration} ms
                                </span>
                            )}
                        </span>
                    )}
                </div>
                {children && (
                    <div className={styles['node-content']}>
                        {children}
                    </div>
                )}
                {runtime?.output !== undefined && (
                    <NodeResult
                        nodeId={props.id}
                        output={runtime.output}
                        input={data?.input}
                        duration={duration}
                        nodeLabel={node_label}
                    />
                )}
            </div>
        </div>
    );
}
