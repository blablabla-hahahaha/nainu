import { Button, Divider, Flex, Select, Slider, Tag, Tooltip, Typography } from "antd";
import {
    CaretRightOutlined,
    HistoryOutlined,
    PauseCircleOutlined,
    PauseOutlined,
    PlayCircleOutlined,
    StepForwardOutlined,
} from "@ant-design/icons";
import { theme } from "antd";
import type { replay_control } from "./use-replay-state";

interface replay_controls_props {
    control: replay_control;
}

const speed_options = [
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 4, label: '4x' },
];

/**
 * 运行与回放控制条：运行/暂停/恢复（live）+ 回放/播放/步进/进度（replay）。
 */
export default function ReplayControls({ control }: replay_controls_props) {
    const { token } = theme.useToken();
    const is_replay = control.mode === 'replay';
    const is_running = control.execution_status === 'running';

    return (
        <Flex
            gap={8}
            align="center"
            style={{
                padding: '8px 16px',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                flexWrap: 'wrap',
            }}
        >
            <Tooltip title="提交当前图并实时跟随执行">
                <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={() => control.run()}
                    loading={is_running}
                >
                    运行
                </Button>
            </Tooltip>
            <Button
                icon={<PauseCircleOutlined />}
                onClick={() => control.pause()}
                disabled={!control.runId || !is_running}
            >
                暂停
            </Button>
            <Button
                icon={<StepForwardOutlined />}
                onClick={() => control.resume()}
                disabled={!control.runId || control.execution_status !== 'paused'}
            >
                恢复
            </Button>

            <Divider type="vertical" />

            <Tooltip title="加载该次执行的事件历史，进入回放模式">
                <Button
                    icon={<HistoryOutlined />}
                    onClick={() => control.load_replay()}
                    disabled={!control.runId}
                >
                    回放
                </Button>
            </Tooltip>
            <Button
                icon={control.playing ? <PauseOutlined /> : <CaretRightOutlined />}
                onClick={() => (control.playing ? control.stop_play() : control.play())}
                disabled={!is_replay}
            >
                {control.playing ? '暂停播放' : '播放'}
            </Button>
            <Button
                icon={<StepForwardOutlined />}
                onClick={() => control.step()}
                disabled={!is_replay}
            >
                步进
            </Button>
            <Select
                value={control.speed}
                onChange={control.set_speed}
                options={speed_options}
                style={{ width: 72 }}
                disabled={!is_replay}
            />

            <Slider
                style={{ flex: 1, minWidth: 120 }}
                min={0}
                max={Math.max(0, control.events.length - 1)}
                value={control.position}
                onChange={control.seek}
                disabled={!is_replay}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {control.position}/{control.events.length}
            </Typography.Text>

            <Tag color={is_replay ? 'geekblue' : execution_tag_color(control.execution_status)}>
                {is_replay ? '回放' : control.execution_status}
            </Tag>
            {control.error_message && (
                <Typography.Text type="danger" style={{ fontSize: 12 }}>
                    {control.error_message}
                </Typography.Text>
            )}
        </Flex>
    );
}

function execution_tag_color(status: string): string {
    switch (status) {
        case 'running': return 'processing';
        case 'completed': return 'success';
        case 'failed':
        case 'error': return 'error';
        case 'paused':
        case 'suspended': return 'warning';
        default: return 'default';
    }
}
