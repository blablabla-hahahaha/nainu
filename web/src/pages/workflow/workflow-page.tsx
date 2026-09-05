import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { theme } from "antd";
import { default as Workflow } from "@/components/workflow/workflow";
import {
    create_registry,
    create_default_registry,
    create_generic_node_icon,
} from "@/components/workflow/nodes";
import { workflow_reducer, workflow_state_context, node_name } from "@/components/workflow/graph";
import type { workflow_state, workflow_graph, workflow_view } from "@/components/workflow/graph";
import { EMPTY_RUNTIME } from "@/components/workflow/graph";
import { useReplayState } from "@/components/workflow/replay/use-replay-state";
import { default as ReplayControls } from "@/components/workflow/replay/replay-controls";
import { default as EventLogPanel } from "@/components/workflow/replay/event-log-panel";
import { NodeSettingProvider } from "@/components/workflow/components/node-setting-provider";
import { default as OutputNode } from "./nodes/output/output-node";
import { default as Condition } from "./nodes/condition/condition-node";
import { default as ConditionSettings } from "./nodes/condition/condition-settings";
import { default as OutputSettings } from "./nodes/output/output-settings";
import { ScriptNode, ScriptSettings } from "./nodes/script";

const page_canvas_style = {
    position: 'absolute' as const,
    height: 'calc(100vh - 56px)',
    width: '100%',
    right: 0,
    top: 0,
    display: 'flex' as const,
    flexDirection: 'column' as const,
};

/** 节点配置卡片宽度（保持原样，不随事件日志面板变化）。 */
const node_config_card_width = 450;
/** 事件日志卡片（组合：执行记录 list + 事件日志）总宽度 = list(150) + 事件日志(450)。 */
const event_log_panel_width = 600;
/** 检查器内部卡片间距。 */
const inspector_gap = 12;
/** 默认工作流节点卡片宽度（与 status.module.css .workflow-node 的 width 保持一致）。 */
const node_card_width = 235;
/** 默认工作流相邻节点的水平净空，保证节点间有可见间隔、不互相重叠。 */
const node_horizontal_gap = 100;
/** 默认工作流相邻节点的列间距（节点卡片宽度 + 水平净空）。 */
const node_column_step = node_card_width + node_horizontal_gap;
/** 默认工作流主行最左节点的 X 坐标。 */
const node_first_column_x = 40;
/** 默认工作流主行节点 Y 坐标。 */
const node_main_row_y = 200;
/** 默认工作流条件分支上侧分支节点 Y 坐标。 */
const node_branch_top_y = 120;
/** 默认工作流条件分支下侧分支节点 Y 坐标。 */
const node_branch_bottom_y = 300;

/**
 * 初始化三切片状态：编辑器默认图（START/DEBUG/CONDITION/END + 条件边）。
 */
function init_workflow_state(): workflow_state {
    const graph: workflow_graph = {
        id: 'editor-demo',
        name: '新工作流',
        version: 1,
        nodes: [
            { id: 'start', type: 'START', config: { name: '开始节点' } },
            {
                id: 'debug',
                type: 'DEBUG',
                config: { name: '指定输出', jsonTemplate: '{"result_username":"张三0","result_age":10}' },
                output: [
                    { key: 'result_username', keyAlias: 'username' },
                    { key: 'result_age', keyAlias: 'age' },
                ],
            },
            {
                id: 'code',
                type: 'SCRIPT',
                config: {
                    name: '编码节点',
                    language: 'javascript',
                    script: 'function main() {\n  return { username: params.username, age: params.age, greeting: "你好 " + params.username };\n}',
                },
                input: [
                    { key: 'username', type: 'INTERNAL_REF', value: 'debug:username' },
                    { key: 'age', type: 'INTERNAL_REF', value: 'debug:age' },
                ],
                output: [
                    { key: 'username', keyAlias: 'username' },
                    { key: 'age', keyAlias: 'age' },
                    { key: 'greeting', keyAlias: 'greeting' },
                ],
            },
            { id: 'condition', type: 'CONDITION', config: { name: '条件分支' }, input: [{ key: 'username', type: 'INTERNAL_REF', value: 'code:username' }] },
            { id: 'end_1', type: 'DEBUG', config: { name: '分支一' } },
            { id: 'end_2', type: 'DEBUG', config: { name: '分支二' } },
            { id: 'end', type: 'END', config: { name: '结束' } },
        ],
        edges: [
            { id: 'e1', source: 'start', target: 'debug' },
            { id: 'e2', source: 'debug', target: 'code' },
            { id: 'e3', source: 'code', target: 'condition' },
            {
                id: 'e4',
                source: 'condition',
                target: 'end_1',
                sourceHandle: 'branch-1',
                condition: {
                    branchType: 'IF',
                    logicOperator: 'AND',
                    conditions: [
                        {
                            field: { key: 'username', type: 'INTERNAL_REF', value: 'code:username' },
                            operator: 'EQUALS',
                            value: '张三0',
                        },
                    ],
                },
            },
            {
                id: 'e5',
                source: 'condition',
                target: 'end_2',
                sourceHandle: 'branch-2',
                condition: { branchType: 'ELSE' },
            },
            { id: 'e6', source: 'end_1', target: 'end' },
            { id: 'e7', source: 'end_2', target: 'end' },
        ],
    };
    const view: workflow_view = {
        positions: {
            start: { x: node_first_column_x, y: node_main_row_y },
            debug: { x: node_first_column_x + node_column_step, y: node_main_row_y },
            code: { x: node_first_column_x + 2 * node_column_step, y: node_main_row_y },
            condition: { x: node_first_column_x + 3 * node_column_step, y: node_main_row_y },
            end_1: { x: node_first_column_x + 4 * node_column_step, y: node_branch_top_y },
            end_2: { x: node_first_column_x + 4 * node_column_step, y: node_branch_bottom_y },
            end: { x: node_first_column_x + 5 * node_column_step, y: node_main_row_y },
        },
    };
    return { graph, view, runtime: EMPTY_RUNTIME };
}

/**
 * 工作流编辑器页（受控）：useReducer 持有三切片，画布只做投影与派发；
 * 运行/回放经 useReplayState 驱动同一 reducer 的 runtime 切片。
 * 右侧检查器：执行记录卡片置顶，下方【节点配置】【事件日志】并排且复用同一卡片；
 * 事件日志与执行记录仅在被执行过（存在 runs）时出现，节点配置随选中节点出现。
 */
export default function WorkflowPage() {
    const { token } = theme.useToken();
    const [state, dispatch] = useReducer(workflow_reducer, undefined, init_workflow_state);
    const control = useReplayState(state.graph, dispatch);
    const { reset_to_init, load_replay, runs } = control;
    const [selected_node_id, set_selected_node_id] = useState<string | null>(null);
    const [show_event_log, set_show_event_log] = useState(true);

    // 注册表记忆化：nodeTypes/edgeTypes 每次渲染重建会触发 React Flow 告警并导致画布重挂载
    const custom_registry = useMemo(() => {
        const default_registry = create_default_registry(token);
        return create_registry([
            ...default_registry.entries,
            {
                type: 'CONDITION',
                label: '条件分支',
                icon: create_generic_node_icon(token.colorPrimary),
                node: Condition,
                nodeSettings: ConditionSettings,
            },
            {
                type: 'DEBUG',
                label: '指定输出',
                icon: create_generic_node_icon(token.colorPrimary),
                node: OutputNode,
                nodeSettings: OutputSettings,
            },
            {
                type: 'SCRIPT',
                label: '编码节点',
                icon: create_generic_node_icon(token.colorPrimary),
                node: ScriptNode,
                nodeSettings: ScriptSettings,
            },
        ]);
    }, [token]);

    const handle_open_node = useCallback((node_id: string) => {
        set_selected_node_id(node_id);
    }, []);

    const handle_close_panel = useCallback(() => {
        set_selected_node_id(null);
    }, []);

    const handle_open_log = useCallback(() => {
        set_show_event_log(true);
        const latest_run = runs[0];
        if (latest_run) {
            void load_replay(latest_run.runId);
        }
    }, [runs, load_replay]);

    const handle_close_log = useCallback(() => {
        set_show_event_log(false);
        reset_to_init();
    }, [reset_to_init]);

    // 节点 id → 显示名，供事件日志展示（graph.nodes 引用在 run 期间稳定，避免运行中反复重算）
    const node_name_map = useMemo(() => {
        const map: Record<string, string> = {};
        for (const n of state.graph.nodes) {
            map[n.id] = node_name(n);
        }
        return map;
    }, [state.graph.nodes]);

    // 切换到某次运行（新运行 / 点击执行记录回放）时重开事件日志
    useEffect(() => {
        if (control.runId) {
            set_show_event_log(true);
        }
    }, [control.runId]);

    // 执行启动即失败（无 runId，如 DSL 校验错误）时也打开调试结果卡，展示错误提示条。
    useEffect(() => {
        if (control.execution_status === 'error') {
            set_show_event_log(true);
        }
    }, [control.execution_status]);

    const selected_node = state.graph.nodes.find((n) => n.id === selected_node_id);
    const has_runs = control.runs.length > 0;
    const has_error = !!control.error_message;
    const show_node = !!selected_node;
    const show_log = (has_runs || has_error) && show_event_log;
    const show_inspector = show_node || show_log;

    return (
        <workflow_state_context.Provider value={{ state, dispatch }}>
            <div style={page_canvas_style}>
                <ReplayControls control={control} log_open={show_log} on_open_log={handle_open_log} />
                <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                    <Workflow
                        registry={custom_registry}
                        state={state}
                        dispatch={dispatch}
                        on_open_node={handle_open_node}
                        on_close_panel={handle_close_panel}
                    />
                    {show_inspector && (
                        <div
                            style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                display: 'flex',
                                gap: inspector_gap,
                                padding: 16,
                                alignItems: 'stretch',
                                zIndex: 20,
                            }}
                        >
                            {show_node && (
                                <div style={{ width: node_config_card_width }}>
                                    <NodeSettingProvider
                                        nodeId={selected_node.id}
                                        nodeType={selected_node.type}
                                        onClose={handle_close_panel}
                                        nodeSettingTypes={custom_registry.nodeSettingTypes}
                                    />
                                </div>
                            )}
                            {show_log && (
                                <div style={{ width: event_log_panel_width }}>
                                    <EventLogPanel
                                        events={control.events}
                                        runs={control.runs}
                                        node_names={node_name_map}
                                        active_run_id={control.runId}
                                        error_message={control.error_message}
                                        on_select_run={(run_id) => void control.load_replay(run_id)}
                                        onClose={handle_close_log}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </workflow_state_context.Provider>
    );
}
