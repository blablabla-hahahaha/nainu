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
                                <Tag color={event_color(e)} style={{ marginInlineEnd: 0 }}>
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
                            {e.detail && (
                                <Typography.Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>
                                    异常详情：{e.detail}
                                </Typography.Text>
                            )}
                        </Flex>
                    </List.Item>
                )}
            />
        </div>
    );
});
