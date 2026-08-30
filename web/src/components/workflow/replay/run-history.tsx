import { memo } from "react";
import { Button, Flex, List, Tag, theme, Typography } from "antd";
import type { run_history_entry, replay_execution_status } from "./use-replay-state";

interface run_history_props {
    /** 执行历史（新→旧）。 */
    runs: run_history_entry[];
    /** 当前选中的 runId；用于高亮。 */
    active_run_id?: string;
    /** 点击某条执行记录时回调（回放该次执行）。 */
    on_select: (run_id: string) => void;
}

/** 执行状态 → 中文文案。 */
const STATUS_TEXT: Record<replay_execution_status, string> = {
    running: '运行中',
    completed: '成功',
    failed: '失败',
    paused: '已暂停',
    suspended: '已挂起',
    error: '异常',
    idle: '未执行',
};

/** 执行状态 → 标签色。 */
const STATUS_COLORS: Record<replay_execution_status, string> = {
    running: 'processing',
    completed: 'success',
    failed: 'error',
    paused: 'warning',
    suspended: 'warning',
    error: 'error',
    idle: 'default',
};

function format_time(ts: number): string {
    return new Date(ts).toLocaleTimeString();
}

/**
 * 执行记录列表内容（新→旧，展示「记录N」+ 中文状态 + 时间，不展示 runId）。
 * 由「事件日志卡片」组合容器提供卡片外壳，本组件只渲染列表（便于与事件日志同卡左右分栏）。
 */
export default memo(function RunHistory({ runs, active_run_id, on_select }: run_history_props) {
    const { token } = theme.useToken();
    return (
        <List
            size="small"
            dataSource={runs}
            renderItem={(run, index) => {
                const is_active = run.runId === active_run_id;
                return (
                    <List.Item style={{ padding: '2px 0' }}>
                        <Button
                            type="text"
                            block
                            style={{
                                textAlign: 'left',
                                padding: '6px 20px',
                                height: 'auto',
                                borderRadius: 0,
                                background: is_active ? token.colorPrimaryBg : undefined,
                            }}
                            onClick={() => on_select(run.runId)}
                        >
                            <Flex vertical gap={2} style={{ width: '100%' }}>
                                <Flex justify="space-between" align="center">
                                    <Typography.Text strong style={{ fontSize: 12 }}>
                                        记录{runs.length - index}
                                    </Typography.Text>
                                    <Tag color={STATUS_COLORS[run.status] ?? 'default'} style={{ marginInlineEnd: 0 }}>
                                        {STATUS_TEXT[run.status]}
                                    </Tag>
                                </Flex>
                                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                    {format_time(run.startedAt)}
                                </Typography.Text>
                            </Flex>
                        </Button>
                    </List.Item>
                );
            }}
        />
    );
});
