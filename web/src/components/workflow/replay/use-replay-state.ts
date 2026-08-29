/**
 * 回放状态钩子：live（EventSource 实时跟随）与 replay（历史步进/播放）双模式。
 * 事件统一经 dispatch(runtime/apply_event) 驱动 runtime 切片（与编辑器共用 reducer）。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { workflow_action, workflow_graph, trace_event } from '@/components/workflow/graph';
import {
    execute_workflow,
    fetch_events,
    open_trace_stream,
    pause_run,
    resume_run,
} from '@/services/workflow';

export type replay_mode = 'live' | 'replay';

export type replay_execution_status =
    | 'idle'
    | 'running'
    | 'completed'
    | 'failed'
    | 'paused'
    | 'suspended'
    | 'error';

export interface replay_control {
    runId?: string;
    mode: replay_mode;
    events: trace_event[];
    position: number;
    playing: boolean;
    speed: number;
    execution_status: replay_execution_status;
    error_message?: string;
    run: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    load_replay: () => Promise<void>;
    play: () => void;
    stop_play: () => void;
    step: () => void;
    seek: (position: number) => void;
    set_speed: (speed: number) => void;
}

export function useReplayState(
    graph: workflow_graph,
    dispatch: Dispatch<workflow_action>,
): replay_control {
    const [runId, setRunId] = useState<string>();
    const [mode, setMode] = useState<replay_mode>('live');
    const [events, setEvents] = useState<trace_event[]>([]);
    const [position, setPosition] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [execution_status, setExecutionStatus] = useState<replay_execution_status>('idle');
    const [error_message, setErrorMessage] = useState<string>();
    const events_ref = useRef<trace_event[]>([]);
    const source_ref = useRef<EventSource | null>(null);
    const timer_ref = useRef<number | null>(null);

    events_ref.current = events;

    /** 重放核心：reset 后按序重放 [0, end) 到 runtime 切片。 */
    const apply_up_to = useCallback((end: number) => {
        dispatch({ type: 'runtime/reset' });
        for (let i = 0; i < end; i++) {
            dispatch({ type: 'runtime/apply_event', event: events_ref.current[i] });
        }
    }, [dispatch]);

    /** 播放计时器（replay 模式）。 */
    useEffect(() => {
        if (!playing || mode !== 'replay') {
            return;
        }
        timer_ref.current = window.setInterval(() => {
            setPosition((p) => {
                const next = Math.min(p + 1, events_ref.current.length);
                if (next === events_ref.current.length) {
                    setPlaying(false);
                }
                return next;
            });
        }, Math.max(250, 1000 / speed));
        return () => {
            if (timer_ref.current !== null) {
                window.clearInterval(timer_ref.current);
            }
        };
    }, [playing, speed, mode]);

    /** 位置变化 → 重放。 */
    useEffect(() => {
        if (mode === 'replay') {
            apply_up_to(position);
        }
    }, [position, mode, apply_up_to]);

    /** 卸载清理。 */
    useEffect(() => () => {
        source_ref.current?.close();
        if (timer_ref.current !== null) {
            window.clearInterval(timer_ref.current);
        }
    }, []);

    const run = useCallback(async () => {
        try {
            setErrorMessage(undefined);
            setEvents([]);
            setPosition(0);
            setMode('live');
            setExecutionStatus('running');
            dispatch({ type: 'runtime/reset' });
            source_ref.current?.close();
            const response = await execute_workflow(graph);
            if (!response.runId) {
                throw new Error(response.message ?? '执行未返回 runId');
            }
            setRunId(response.runId);
            source_ref.current = open_trace_stream(response.runId, {
                on_event: (event) => {
                    setEvents((prev) => [...prev, event]);
                    dispatch({ type: 'runtime/apply_event', event });
                    if (event.type === 'EXECUTION_COMPLETED' || event.type === 'EXECUTION_FAILED') {
                        setExecutionStatus(event.type === 'EXECUTION_COMPLETED' ? 'completed' : 'failed');
                        source_ref.current?.close();
                    }
                },
                on_error: () => {
                    // 原生 EventSource 自动重连；终态由 EXECUTION_* 事件关闭
                },
            });
        } catch (error) {
            setExecutionStatus('error');
            setErrorMessage(error instanceof Error ? error.message : String(error));
        }
    }, [graph, dispatch]);

    const pause = useCallback(async () => {
        if (!runId) {
            return;
        }
        try {
            await pause_run(runId);
            setExecutionStatus('paused');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : String(error));
        }
    }, [runId]);

    const resume = useCallback(async () => {
        if (!runId) {
            return;
        }
        try {
            await resume_run(runId);
            setExecutionStatus('running');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : String(error));
        }
    }, [runId]);

    const load_replay = useCallback(async () => {
        if (!runId) {
            return;
        }
        try {
            const loaded = await fetch_events(runId);
            source_ref.current?.close();
            setEvents(loaded);
            setMode('replay');
            setPosition(0);
            setPlaying(false);
            setExecutionStatus(
                loaded.some((e) => e.type === 'EXECUTION_COMPLETED') ? 'completed' : 'idle',
            );
            apply_up_to(0);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : String(error));
        }
    }, [runId, apply_up_to]);

    const play = useCallback(() => {
        if (mode === 'replay') {
            setPlaying(true);
        }
    }, [mode]);

    const stop_play = useCallback(() => setPlaying(false), []);

    const step = useCallback(() => {
        setPosition((p) => Math.min(p + 1, events_ref.current.length));
    }, []);

    const seek = useCallback((pos: number) => setPosition(pos), []);

    return {
        runId,
        mode,
        events,
        position,
        playing,
        speed,
        execution_status,
        error_message,
        run,
        pause,
        resume,
        load_replay,
        play,
        stop_play,
        step,
        seek,
        set_speed: setSpeed,
    };
}
