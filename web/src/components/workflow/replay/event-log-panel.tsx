import { memo } from 'react';
import { Button, Flex, theme, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { default as InspectorCard } from '../components/inspector-card';
import { default as RunHistory } from './run-history';
import { default as EventLog } from './event-log';
import type { run_history_entry } from './use-replay-state';
import type { trace_event } from '@/components/workflow/graph';

interface event_log_panel_props {
    events: trace_event[];
    /** 执行历史（新→旧）。 */
    runs: run_history_entry[];
    /** 节点 id → 显示名（供事件日志展示）。 */
    node_names: Record<string, string>;
    active_run_id?: string;
    /** 工作流级错误信息（如执行启动失败）；存在时在卡片顶部以红色提示条展示。 */
    error_message?: string;
    /** 点击某条执行记录时回调（回放该次执行）。 */
    on_select_run: (run_id: string) => void;
    /** 关闭整张「执行记录 / 事件日志」卡片时回调。 */
    onClose: () => void;
}

/** 执行记录列宽。 */
const RUN_LIST_WIDTH = 150;

/** 缩短 runId 便于展示（保留首尾各 4 字符）。 */
function short_run_id(run_id: string): string {
    return run_id.length > 10 ? `${run_id.slice(0, 4)}…${run_id.slice(-4)}` : run_id;
}

/**
 * 事件日志卡片（组合）：一张更宽的卡，内部左右分栏——左边执行记录 list（窄），右边事件日志（450）。
 * 与节点配置卡片复用同一 InspectorCard（同卡、同头部关闭按钮、runId 标签）。
 * memo：高频 view 变更引页面重渲染，events/runs 引用在拖拽期间稳定。
 */
export default memo(function EventLogPanel({
    events,
    runs,
    node_names,
    active_run_id,
    error_message,
    on_select_run,
    onClose,
}: event_log_panel_props) {
    const { token } = theme.useToken();
    return (
        <InspectorCard
            title="调试结果"
            bodyPadding={0}
            extra={
                <Flex gap={6} align="center">
                    {active_run_id && (
                        <>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {short_run_id(active_run_id)}
                            </Typography.Text>
                            <span style={{
                                width: 1,
                                height: 15,
                                background: token.colorBorderSecondary,
                                margin: '0 10px',
                                display: 'inline-block',
                                verticalAlign: 'middle',
                            }} />
                        </>
                    )}
                    <Button type="text" icon={<CloseOutlined />} size="small" onClick={onClose} />
                </Flex>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                {error_message && (
                    <div style={{
                        // 保留 alert 原本的圆角/背景/内部 padding，仅去掉边框；margin 按 UI 调整值。
                        margin: '8px 10px 12px 10px',
                        padding: '8px 12px',
                        borderRadius: token.borderRadiusLG,
                        background: token.colorErrorBg,
                        color: token.colorError,
                        fontWeight: 600,
                        fontSize: 12,
                    }}>
                        {error_message}
                    </div>
                )}
                <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                    <div
                        style={{
                            width: RUN_LIST_WIDTH,
                            boxSizing: 'border-box',
                            flexShrink: 0,
                            borderRight: `1px solid ${token.colorBorderSecondary}`,
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                        }}
                    >
                        <Typography.Text strong style={{ padding: '8px 20px' }}>执行记录</Typography.Text>
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            <RunHistory runs={runs} active_run_id={active_run_id} on_select={on_select_run} />
                        </div>
                    </div>
                    <div
                        style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                        }}
                    >
                        <Typography.Text strong style={{ padding: '8px 12px' }}>事件日志</Typography.Text>
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            <EventLog events={events} node_names={node_names} />
                        </div>
                    </div>
                </div>
            </div>
        </InspectorCard>
    );
});
