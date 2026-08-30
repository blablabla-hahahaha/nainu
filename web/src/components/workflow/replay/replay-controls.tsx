import { memo } from "react";
import { Button, Divider, Flex, Select, Slider, Tooltip, Typography, theme } from "antd";
import {
    CaretRightOutlined,
    ExperimentOutlined,
    PauseCircleOutlined,
    PauseOutlined,
    PlayCircleOutlined,
    StepForwardOutlined,
} from "@ant-design/icons";
import type { replay_control } from "./use-replay-state";

interface replay_controls_props {
    control: replay_control;
    /** 调试记录面板当前是否打开（打开时禁用「调试记录」按钮）。 */
    log_open: boolean;
    /** 打开调试记录面板（执行记录 + 事件日志）时回调。 */
    on_open_log: () => void;
}

const speed_options = [
    { value: 2, label: '1x' },
    { value: 4, label: '2x' },
    { value: 8, label: '4x' },
];

/**
 * 运行与回放控制条：播放/步进/进度（replay）居左，运行/暂停/恢复/调试记录（live）常驻右侧。
 * 播放组始终展示；未执行过（无 run）时其按钮全部禁用，仅表达「尚无内容可播放」。
 * 操作组始终靠右固定，不因内容增减而左移。
 * 「调试记录」位于操作组最右：无执行记录或面板已打开时禁用。
 * memo：拖拽等高频 view 变更令页面重渲染，但 control 引用在拖拽期间稳定（useReplayState useMemo），
 * 避免拖动节点时无谓重渲整条控制条。
 */
export default memo(function ReplayControls({ control, log_open, on_open_log }: replay_controls_props) {
    const { token } = theme.useToken();
    const is_replay = control.mode === 'replay';
    const is_running = control.execution_status === 'running';
    const has_runs = control.runs.length > 0;

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
            <Button
                icon={control.playing ? <PauseOutlined /> : <CaretRightOutlined />}
                onClick={() => (control.playing ? control.stop_play() : void control.play())}
                disabled={!control.runId}
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

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Divider type="vertical" />
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
                {control.error_message && (
                    <Typography.Text type="danger" style={{ fontSize: 12 }}>
                        {control.error_message}
                    </Typography.Text>
                )}
                <Button
                    icon={<ExperimentOutlined />}
                    onClick={on_open_log}
                    disabled={!has_runs || log_open}
                >
                    调试记录
                </Button>
            </div>
        </Flex>
    );
});
