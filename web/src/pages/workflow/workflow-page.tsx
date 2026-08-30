import { useMemo, useReducer } from 'react';
import { theme } from "antd";
import { default as Workflow } from "@/components/workflow/workflow";
import {
    create_registry,
    create_default_registry,
    create_generic_node_icon,
} from "@/components/workflow/nodes";
import { workflow_reducer } from "@/components/workflow/graph";
import type { workflow_state, workflow_graph, workflow_view } from "@/components/workflow/graph";
import { EMPTY_RUNTIME } from "@/components/workflow/graph";
import { useReplayState } from "@/components/workflow/replay/use-replay-state";
import { default as ReplayControls } from "@/components/workflow/replay/replay-controls";
import { default as EventLog } from "@/components/workflow/replay/event-log";
import { default as OutputNode } from "./nodes/output/output-node";
import { default as Condition } from "./nodes/condition/condition-node";
import { default as ConditionSettings } from "./nodes/condition/condition-settings";
import { default as OutputSettings } from "./nodes/output/output-settings";

const page_canvas_style = {
    position: 'absolute' as const,
    height: 'calc(100vh - 56px)',
    width: '100%',
    right: 0,
    top: 0,
    display: 'flex' as const,
    flexDirection: 'column' as const,
};

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
            { id: 'condition', type: 'CONDITION', config: { name: '条件分支' } },
            { id: 'end_1', type: 'DEBUG', config: { name: '分支一' } },
            { id: 'end_2', type: 'DEBUG', config: { name: '分支二' } },
            { id: 'end', type: 'END', config: { name: '结束' } },
        ],
        edges: [
            { id: 'e1', source: 'start', target: 'debug' },
            { id: 'e2', source: 'debug', target: 'condition' },
            {
                id: 'e3',
                source: 'condition',
                target: 'end_1',
                sourceHandle: 'branch-1',
                condition: {
                    branchType: 'IF',
                    logicOperator: 'AND',
                    conditions: [
                        {
                            field: { key: 'username', type: 'INTERNAL_REF', value: 'debug:username' },
                            operator: 'EQUALS',
                            value: '张三0',
                        },
                    ],
                },
            },
            {
                id: 'e4',
                source: 'condition',
                target: 'end_2',
                sourceHandle: 'branch-2',
                condition: { branchType: 'ELSE' },
            },
            { id: 'e5', source: 'end_1', target: 'end' },
            { id: 'e6', source: 'end_2', target: 'end' },
        ],
    };
    const view: workflow_view = {
        positions: {
            start: { x: 40, y: 200 },
            debug: { x: 260, y: 200 },
            condition: { x: 480, y: 200 },
            end_1: { x: 720, y: 120 },
            end_2: { x: 720, y: 300 },
            end: { x: 940, y: 200 },
        },
    };
    return { graph, view, runtime: EMPTY_RUNTIME };
}

/**
 * 工作流编辑器页（受控）：useReducer 持有三切片，画布只做投影与派发；
 * 运行/回放经 useReplayState 驱动同一 reducer 的 runtime 切片。
 */
export default function WorkflowPage() {
    const { token } = theme.useToken();
    const [state, dispatch] = useReducer(workflow_reducer, undefined, init_workflow_state);
    const control = useReplayState(state.graph, dispatch);

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
        ]);
    }, [token]);

    return (
        <div style={page_canvas_style}>
            <ReplayControls control={control} />
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                    <Workflow
                        registry={custom_registry}
                        state={state}
                        dispatch={dispatch}
                    />
                </div>
                <EventLog events={control.events} />
            </div>
        </div>
    );
}
