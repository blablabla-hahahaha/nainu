/**
 * 三切片 reducer：canonical / view / runtime。
 * 编辑器变更动作与回放事件（runtime/apply_event）走同一状态流。
 * 纯函数，无 React 依赖。
 */
import type {
    workflow_state,
    workflow_graph,
    workflow_view,
    workflow_runtime,
    graph_node,
    graph_edge,
    node_runtime_status,
    trace_event,
} from './types.ts';
import { EMPTY_RUNTIME } from './types.ts';
import { with_view } from './canonical.ts';
import { uuid } from '@/utils/id-gen';

/**
 * 递增图版本：后端 StateGraphCompiler 按 (workflowId, version) 缓存编译结果，
 * 编辑器 DSL 变更必须递增 version 使缓存失效，否则每次运行都复用首次编译的旧图。
 */
function bump_graph_version(graph: workflow_graph): workflow_graph {
    return { ...graph, version: (graph.version ?? 0) + 1 };
}

export type workflow_action =
    | { type: 'graph/load'; graph: workflow_graph; view?: workflow_view }
    | { type: 'graph/add_node'; node: graph_node; position: { x: number; y: number } }
    | { type: 'graph/remove_node'; nodeId: string }
    | {
        type: 'graph/update_node';
        nodeId: string;
        config?: Record<string, unknown>;
        input?: graph_node['input'];
        output?: graph_node['output'];
    }
    | { type: 'graph/connect_edge'; source: string; sourceHandle?: string; target: string }
    | { type: 'graph/remove_edge'; edgeId: string }
    | { type: 'graph/update_edge'; edgeId: string; condition?: graph_edge['condition']; target?: string }
    | { type: 'graph/set_condition_edges'; source: string; edges: graph_edge[] }
    | { type: 'view/move_node'; nodeId: string; position: { x: number; y: number } }
    | { type: 'view/set_viewport'; viewport: { x: number; y: number; zoom: number } }
    | { type: 'runtime/apply_event'; event: trace_event }
    | { type: 'runtime/reset' };

export function workflow_reducer(state: workflow_state, action: workflow_action): workflow_state {
    switch (action.type) {
        case 'graph/load': {
            const view = action.view ?? { positions: {} };
            return { graph: with_view(action.graph, view), view, runtime: EMPTY_RUNTIME };
        }

        case 'graph/add_node':
            return {
                ...state,
                graph: bump_graph_version({ ...state.graph, nodes: [...state.graph.nodes, action.node] }),
                view: { ...state.view, positions: { ...state.view.positions, [action.node.id]: action.position } },
            };

        case 'graph/remove_node': {
            const nodes = state.graph.nodes.filter((n) => n.id !== action.nodeId);
            const edges = state.graph.edges.filter((e) => e.source !== action.nodeId && e.target !== action.nodeId);
            return { ...state, graph: bump_graph_version({ ...state.graph, nodes, edges }) };
        }

        case 'graph/update_node': {
            const nodes = state.graph.nodes.map((n) => {
                if (n.id !== action.nodeId) {
                    return n;
                }
                const next: graph_node = { id: n.id, type: n.type };
                if (action.config !== undefined) {
                    next.config = action.config;
                } else if (n.config !== undefined) {
                    next.config = n.config;
                }
                if (action.input !== undefined) {
                    next.input = action.input;
                } else if (n.input !== undefined) {
                    next.input = n.input;
                }
                if (action.output !== undefined) {
                    next.output = action.output;
                } else if (n.output !== undefined) {
                    next.output = n.output;
                }
                return next;
            });
            return { ...state, graph: bump_graph_version({ ...state.graph, nodes }) };
        }

        case 'graph/connect_edge': {
            const existing = state.graph.edges.find(
                (e) => e.source === action.source
                    && e.sourceHandle === action.sourceHandle
                    && !e.target,
            );
            const edges = existing
                ? state.graph.edges.map((e) => (e.id === existing.id ? { ...e, target: action.target } : e))
                : [
                    ...state.graph.edges,
                    {
                        id: uuid(),
                        source: action.source,
                        sourceHandle: action.sourceHandle,
                        target: action.target,
                    },
                ];
            return { ...state, graph: bump_graph_version({ ...state.graph, edges }) };
        }

        case 'graph/remove_edge':
            return { ...state, graph: bump_graph_version({ ...state.graph, edges: state.graph.edges.filter((e) => e.id !== action.edgeId) }) };

        case 'graph/update_edge': {
            const edges = state.graph.edges.map((e) => {
                if (e.id !== action.edgeId) {
                    return e;
                }
                const next: graph_edge = { ...e };
                if (action.condition !== undefined) {
                    next.condition = action.condition;
                }
                if (action.target !== undefined) {
                    next.target = action.target;
                }
                return next;
            });
            return { ...state, graph: bump_graph_version({ ...state.graph, edges }) };
        }

        case 'graph/set_condition_edges': {
            const others = state.graph.edges.filter((e) => e.source !== action.source);
            return { ...state, graph: bump_graph_version({ ...state.graph, edges: [...others, ...action.edges] }) };
        }

        case 'view/move_node':
            return {
                ...state,
                view: {
                    ...state.view,
                    positions: { ...state.view.positions, [action.nodeId]: action.position },
                },
            };

        case 'view/set_viewport':
            return { ...state, view: { ...state.view, viewport: action.viewport } };

        case 'runtime/apply_event':
            return { ...state, runtime: apply_runtime_event(state, action.event) };

        case 'runtime/reset':
            return { ...state, runtime: EMPTY_RUNTIME };

        default:
            return state;
    }
}

// ---------- runtime 事件 → 七态 ----------

function apply_runtime_event(state: workflow_state, event: trace_event): workflow_runtime {
    const execution = { ...state.runtime.execution, lastSeq: event.seq };
    switch (event.type) {
        case 'EXECUTION_STARTED':
            return {
                execution: { ...execution, status: 'running' },
                nodes: Object.fromEntries(state.graph.nodes.map((n) => [n.id, { type: 'wait' as const }])),
            };
        case 'EXECUTION_COMPLETED':
            return { ...state.runtime, execution: { ...execution, status: 'completed' } };
        case 'EXECUTION_FAILED':
            return { ...state.runtime, execution: { ...execution, status: 'failed' } };
        case 'EXECUTION_PAUSED':
            return { ...state.runtime, execution: { ...execution, status: 'paused' } };
        case 'EXECUTION_RESUMED':
            return { ...state.runtime, execution: { ...execution, status: 'running' } };
        case 'NODE_STARTED':
            return { ...state.runtime, execution, nodes: patch_node(state, event, { type: 'runnable' }) };
        case 'NODE_SUCCEEDED':
            return {
                ...state.runtime,
                execution,
                nodes: patch_node(state, event, {
                    type: 'success',
                    duration: event.duration,
                    output: event.output,
                }),
            };
        case 'NODE_FAILED':
            return {
                ...state.runtime,
                execution,
                nodes: patch_node(state, event, {
                    type: 'failed',
                    message: event.message,
                    errorCategory: event.errorCategory,
                    errorCode: event.errorCode,
                    retryable: event.retryable,
                    detail: event.detail,
                }),
            };
        case 'NODE_SUSPENDED':
            return {
                ...state.runtime,
                execution,
                nodes: patch_node(state, event, { type: 'suspended', message: event.message }),
            };
        default:
            return state.runtime;
    }
}

function patch_node(
    state: workflow_state,
    event: trace_event,
    patch: Omit<node_runtime_status, 'type'> & { type: node_runtime_status['type'] },
): Record<string, node_runtime_status> {
    if (!event.nodeId) {
        return state.runtime.nodes;
    }
    return { ...state.runtime.nodes, [event.nodeId]: patch };
}
