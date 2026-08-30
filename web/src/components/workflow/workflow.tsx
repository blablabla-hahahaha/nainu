import { ReactFlowProvider } from '@xyflow/react';
import type { Dispatch } from 'react';

import { default as WorkflowCanvas } from './components/workflow-canvas';
import type { workflow_state } from './graph';
import type { workflow_action } from './graph/reducer';
import type { node_registry } from './nodes';

interface workflow_props {
    registry: node_registry;
    state: workflow_state;
    dispatch: Dispatch<workflow_action>;
    /** 节点被点击（打开其设置卡片）时回调；由父级决定选中节点并渲染设置卡片。 */
    on_open_node: (node_id: string) => void;
    /** 画布空白处点击（关闭节点设置卡片）时回调。 */
    on_close_panel: () => void;
}

/**
 * 工作流画布主组件（受控）：提供 ReactFlowProvider，画布子树经其渲染。
 * 工作流状态上下文（workflow_state_context）由页面统一提供，
 * 使画布与右侧节点设置/事件日志卡片共享同一 state + dispatch。
 */
export default function Workflow(props: workflow_props) {
    const { registry, state, dispatch, on_open_node, on_close_panel } = props;
    return (
        <ReactFlowProvider>
            <WorkflowCanvas
                registry={registry}
                state={state}
                dispatch={dispatch}
                on_open_node={on_open_node}
                on_close_panel={on_close_panel}
            />
        </ReactFlowProvider>
    );
}
