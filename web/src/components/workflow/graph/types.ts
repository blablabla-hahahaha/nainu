/**
 * canonical 图类型：由 common 的 workflow-dsl.schema.json 生成（web/src/generated/workflow-dsl.ts），
 * 本文件只做别名 + view/runtime 两个非 DSL 切片。勿手写 DSL 结构。
 */
import type {
    WorkflowDSL,
    DslNode,
    DslEdge,
    DslCondition,
    DslInputField,
    DslOutputField,
} from '@/generated/workflow-dsl';
import type { node_status_type } from '@/components/workflow/components/status/types';

export type workflow_graph = WorkflowDSL;
export type graph_node = DslNode;
export type graph_edge = DslEdge;
export type graph_condition = DslCondition;
export type graph_input_field = DslInputField;
export type graph_output_field = DslOutputField;

/** 视图切片：布局（位置/视口），可丢弃，持久化到 graph.meta.view。 */
export interface workflow_view {
    positions: Record<string, { x: number; y: number }>;
    viewport?: { x: number; y: number; zoom: number };
}

/** 执行状态（execution_* 事件）。 */
export type execution_status =
    | 'idle'
    | 'running'
    | 'completed'
    | 'failed'
    | 'paused'
    | 'suspended';

/** 节点运行时状态（node_* 事件 → 七态，复用 status/types 的 node_status_type）。 */
export interface node_runtime_status {
    type: node_status_type;
    message?: string;
    /** 错误类别（后端 ErrorCategory#name()）；仅失败节点携带。 */
    errorCategory?: string;
    /** 稳定错误码；仅失败节点携带。 */
    errorCode?: string;
    /** 是否可重试；仅失败节点携带。 */
    retryable?: boolean;
    /** 技术侧错误详情（底层 cause 链简单类名: 消息）；仅失败节点且存在底层原因时携带。 */
    detail?: string;
    duration?: number;
    output?: Record<string, unknown>;
}

/** runtime 切片：执行级 + 节点级状态，执行轨迹，不落库。 */
export interface workflow_runtime {
    execution: {
        status: execution_status;
        runId?: string;
        lastSeq?: string;
    };
    nodes: Record<string, node_runtime_status>;
}

/** 三切片总状态（受控组件契约）。 */
export interface workflow_state {
    graph: workflow_graph;
    view: workflow_view;
    runtime: workflow_runtime;
}

/** trace 事件类型（与后端 TraceEventType 九事件一致）。 */
export type trace_event_type =
    | 'EXECUTION_STARTED'
    | 'EXECUTION_COMPLETED'
    | 'EXECUTION_FAILED'
    | 'EXECUTION_PAUSED'
    | 'EXECUTION_RESUMED'
    | 'NODE_STARTED'
    | 'NODE_SUCCEEDED'
    | 'NODE_FAILED'
    | 'NODE_SUSPENDED';

/** trace 事件（SSE/events 载荷；seq = 后端 XADD ID，用于 Last-Event-ID 续传）。 */
export interface trace_event {
    seq: string;
    type: trace_event_type;
    nodeId?: string;
    message?: string;
    /** 错误类别（后端 ErrorCategory#name()）；仅失败事件携带。 */
    errorCategory?: string;
    /** 稳定错误码；仅失败事件携带。 */
    errorCode?: string;
    /** 是否可重试；仅失败事件携带。 */
    retryable?: boolean;
    /** 技术侧错误详情（底层 cause 链简单类名: 消息）；仅失败事件且存在底层原因时携带。 */
    detail?: string;
    duration?: number;
    output?: Record<string, unknown>;
    occurredAt?: number;
}

export const EMPTY_RUNTIME: workflow_runtime = {
    execution: { status: 'idle' },
    nodes: {},
};
