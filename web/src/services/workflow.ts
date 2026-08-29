/**
 * workflow 服务客户端：REST（execute/events/pause/resume）+ SSE（stream，EventSource 原生重连与 Last-Event-ID 续传）。
 */
import type { workflow_graph, trace_event, trace_event_type } from '@/components/workflow/graph';

const api_base_url = import.meta.env.VITE_MASTER_URL ?? 'http://localhost:8082';

export interface execute_response {
    workflowId?: string;
    dataId?: string;
    runId?: string;
    status?: string;
    message?: string;
}

/**
 * 启动执行：提交 DSL + 输入，返回 runId（后端异步执行）。
 */
export async function execute_workflow(graph: workflow_graph, inputParams?: Record<string, unknown>): Promise<execute_response> {
    const resp = await fetch(`${api_base_url}/api/workflow/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            workflowId: graph.id,
            dataId: 'web',
            graphDefinition: graph,
            inputParams: inputParams ?? {},
        }),
    });
    if (!resp.ok) {
        throw new Error(`执行失败（HTTP ${resp.status}）`);
    }
    return (await resp.json()) as execute_response;
}

/**
 * 历史事件（replay 模式）。
 */
export async function fetch_events(runId: string): Promise<trace_event[]> {
    const resp = await fetch(`${api_base_url}/api/workflow/${runId}/events`);
    if (!resp.ok) {
        throw new Error(`拉取事件失败（HTTP ${resp.status}）`);
    }
    return (await resp.json()) as trace_event[];
}

/**
 * 用户暂停。
 */
export async function pause_run(runId: string): Promise<void> {
    const resp = await fetch(`${api_base_url}/api/workflow/${runId}/pause`, { method: 'POST' });
    if (!resp.ok) {
        throw new Error(`暂停失败（HTTP ${resp.status}）`);
    }
}

/**
 * 恢复（可携带 HITL 输入）。
 */
export async function resume_run(runId: string, interruptInput?: Record<string, unknown>): Promise<void> {
    const resp = await fetch(`${api_base_url}/api/workflow/${runId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interruptInput ?? {}),
    });
    if (!resp.ok) {
        throw new Error(`恢复失败（HTTP ${resp.status}）`);
    }
}

export interface trace_stream_handlers {
    on_event: (event: trace_event) => void;
    on_open?: () => void;
    on_error?: (event: Event) => void;
}

/** 九事件类型（EventSource 命名事件监听用；data 内已含 type）。 */
const TRACE_EVENT_TYPES: trace_event_type[] = [
    'EXECUTION_STARTED',
    'EXECUTION_COMPLETED',
    'EXECUTION_FAILED',
    'EXECUTION_PAUSED',
    'EXECUTION_RESUMED',
    'NODE_STARTED',
    'NODE_SUCCEEDED',
    'NODE_FAILED',
    'NODE_SUSPENDED',
];

/**
 * 打开实时事件流（原生 EventSource：断线自动重连，Last-Event-ID 由浏览器从事件 id 自动续传）。
 * 同时监听默认 message 事件与各命名事件，兼容不同后端 SSE 形态。
 */
export function open_trace_stream(runId: string, handlers: trace_stream_handlers): EventSource {
    const source = new EventSource(`${api_base_url}/api/workflow/${runId}/stream`);
    const deliver = (data: string) => {
        try {
            handlers.on_event(JSON.parse(data) as trace_event);
        } catch {
            // 畸形帧忽略（后端异常帧不阻断流）
        }
    };
    source.onopen = () => handlers.on_open?.();
    source.onmessage = (message) => deliver(message.data);
    for (const type of TRACE_EVENT_TYPES) {
        source.addEventListener(type, (event) => deliver((event as MessageEvent<string>).data));
    }
    source.onerror = (event) => handlers.on_error?.(event);
    return source;
}
