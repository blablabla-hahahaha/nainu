import { memo, useState } from "react";
import { Button, Flex, List, Tag, Typography, theme } from "antd";
import type { trace_event, trace_event_type } from '@/components/workflow/graph';

interface event_log_props {
    events: trace_event[];
    /** 节点 id → 显示名（供条目展示，便于与画布节点对应）。 */
    node_names: Record<string, string>;
}

const EVENT_COLORS: Record<trace_event_type, string> = {
    EXECUTION_STARTED: 'blue',
    EXECUTION_COMPLETED: 'green',
    EXECUTION_FAILED: 'red',
    EXECUTION_PAUSED: 'orange',
    EXECUTION_RESUMED: 'cyan',
    NODE_STARTED: 'geekblue',
    NODE_SUCCEEDED: 'green',
    NODE_FAILED: 'red',
    NODE_SUSPENDED: 'purple',
};

/** 错误类别 → 事件日志标签色（仅失败事件携带 category；缺省回退到类型色）。 */
const CATEGORY_COLORS: Record<string, string> = {
    AUTHORING: 'red',
    PLATFORM: 'purple',
    EXTERNAL: 'orange',
};

/** 取事件标签色：优先按错误类别着色，缺省按事件类型。 */
function event_color(e: trace_event): string {
    if (e.errorCategory && e.errorCategory in CATEGORY_COLORS) {
        return CATEGORY_COLORS[e.errorCategory];
    }
    return EVENT_COLORS[e.type];
}

/** 判断输入/输出是否存在非空内容。 */
function has_payload(m: unknown): boolean {
    return typeof m === 'object' && m !== null && Object.keys(m as object).length > 0;
}

/** 单项事件条目：类型/节点名/耗时/消息 + 可展开的输入/输出 JSON。 */
function EventLogItem({ e, node_names }: { e: trace_event; node_names: Record<string, string> }) {
    const { token } = theme.useToken();
    const [show_io, set_show_io] = useState(false);
    const has_input = has_payload(e.input);
    const has_output = has_payload(e.output);
    const has_io = has_input || has_output;
    const is_node_event = e.type.startsWith('NODE_');
    const node_label = e.nodeId ? (node_names[e.nodeId] || e.nodeId) : undefined;

    return (
        <List.Item style={{ padding: '4px 12px' }}>
            <Flex vertical gap={2} style={{ width: '100%' }}>
                <Flex justify="space-between" align="center">
                    <Tag color={event_color(e)} style={{ marginInlineEnd: 0 }}>
                        {e.type}
                    </Tag>
                    {node_label && (
                        <Typography.Text
                            type="secondary"
                            style={{ fontSize: 11, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={e.nodeId}
                        >
                            {node_label}
                        </Typography.Text>
                    )}
                </Flex>
                {e.duration !== undefined && (
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        耗时 {e.duration} ms
                    </Typography.Text>
                )}
                {e.message && (
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        {e.message}
                    </Typography.Text>
                )}
                {e.detail && (
                    <Typography.Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>
                        异常详情：{e.detail}
                    </Typography.Text>
                )}
                {is_node_event && (
                    has_io ? (
                        <>
                            <Button
                                type="link"
                                size="small"
                                style={{ padding: 0, fontSize: 11, height: 'auto', alignSelf: 'flex-start' }}
                                onClick={() => set_show_io((v) => !v)}
                            >
                                {show_io ? '收起' : '查看'} 输入/输出
                            </Button>
                            {show_io && (
                                <Flex vertical gap={4}>
                                    {has_input && (
                                        <div>
                                            <Typography.Text type="secondary" style={{ fontSize: 11 }}>输入</Typography.Text>
                                            <pre style={{
                                                margin: 0,
                                                fontSize: 10,
                                                fontFamily: 'monospace',
                                                background: token.colorFillQuaternary,
                                                borderRadius: 4,
                                                padding: 6,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                            }}>
                                                {JSON.stringify(e.input, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                    {has_output && (
                                        <div>
                                            <Typography.Text type="secondary" style={{ fontSize: 11 }}>输出</Typography.Text>
                                            <pre style={{
                                                margin: 0,
                                                fontSize: 10,
                                                fontFamily: 'monospace',
                                                background: token.colorFillQuaternary,
                                                borderRadius: 4,
                                                padding: 6,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                            }}>
                                                {JSON.stringify(e.output, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </Flex>
                            )}
                        </>
                    ) : (
                        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            （无输入/输出）
                        </Typography.Text>
                    )
                )}
            </Flex>
        </List.Item>
    );
}

/**
 * 事件日志列表内容（live 实时追加；replay 随位置高亮）。
 * 展示完整 trace 事件：类型 / 节点显示名 / 耗时 / 消息 / 异常详情，节点事件可展开查看输入/输出快照。
 * 由「事件日志卡片」组合容器提供卡片外壳，本组件只渲染事件列表。
 * memo：拖拽等高频 view 变更令页面重渲染，但 events / node_names 引用在拖拽期间稳定。
 */
export default memo(function EventLog({ events, node_names }: event_log_props) {
    return (
        <List size="small" dataSource={events} renderItem={(e) => <EventLogItem e={e} node_names={node_names} />} />
    );
});
