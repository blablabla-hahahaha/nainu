import { ReactFlowProvider } from '@xyflow/react';
import type { Dispatch } from 'react';

import { default as WorkflowCanvas } from './components/workflow-canvas';
import { workflow_state_context } from './graph';
import type { workflow_state } from './graph';
import type { workflow_action } from './graph/reducer';
import type { node_registry } from './nodes';

interface workflow_props {
    registry: node_registry;
    state: workflow_state;
    dispatch: Dispatch<workflow_action>;
}

/**
 * 工作流编辑器主组件（受控）：canonical/view/runtime 三切片由父级持有，
 * 本组件只提供 ReactFlowProvider 与状态上下文，画布子树与设置面板经其读写。
 */
export default function Workflow(props: workflow_props) {
    const { registry, state, dispatch } = props;
    return (
        <workflow_state_context.Provider value={{ state, dispatch }}>
            <ReactFlowProvider>
                <WorkflowCanvas registry={registry} state={state} dispatch={dispatch} />
            </ReactFlowProvider>
        </workflow_state_context.Provider>
    );
}
