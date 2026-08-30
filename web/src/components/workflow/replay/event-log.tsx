import { memo } from "react";
import { Flex, List, Tag, Typography } from "antd";
import { theme } from "antd";
import type { trace_event, trace_event_type } from '@/components/workflow/graph';

interface event_log_props {
    events: trace_event[];
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

/**
 * 事件日志侧栏（live 实时追加；replay 随位置高亮）。
 * memo：拖拽等高频 view 变更令页面重渲染，但 events 引用在拖拽期间稳定（useReplayState useMemo），
 * 避免拖动节点时无谓重渲整个事件列表。
 */
export default memo(function EventLog({ events }: event_log_props) {
    const { token } = theme.useToken();
    return (
        <div
            style={{
                width: 280,
                borderLeft: `1px solid ${token.colorBorderSecondary}`,
                overflowY: 'auto',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Typography.Text strong style={{ padding: '4px 8px' }}>
                事件日志
            </Typography.Text>
            <List
                size="small"
                dataSource={events}
                renderItem={(e) => (
                    <List.Item style={{ padding: '4px 8px' }}>
                        <Flex vertical gap={2} style={{ width: '100%' }}>
                            <Flex justify="space-between" align="center">
                                <Tag color={EVENT_COLORS[e.type]} style={{ marginInlineEnd: 0 }}>
                                    {e.type}
                                </Tag>
                                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                    {e.nodeId || '—'}
                                </Typography.Text>
                            </Flex>
                            {e.message && (
                                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                    {e.message}
                                </Typography.Text>
                            )}
                        </Flex>
                    </List.Item>
                )}
            />
        </div>
    );
});
