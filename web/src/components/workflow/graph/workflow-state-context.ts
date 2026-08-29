/**
 * 工作流状态上下文：受控组件的 state + dispatch 下发给画布子树与设置面板。
 * 设置面板经 useWorkflowState 读 canonical 图、派发变更（不再直连 React Flow store）。
 */
import { createContext, useContext } from 'react';
import type { Dispatch } from 'react';
import type { workflow_state } from './types';
import type { workflow_action } from './reducer';

export interface workflow_state_context_value {
    state: workflow_state;
    dispatch: Dispatch<workflow_action>;
}

export const workflow_state_context = createContext<workflow_state_context_value | null>(null);

/**
 * 读取工作流状态上下文；必须在 Workflow 组件内使用。
 */
export function useWorkflowState(): workflow_state_context_value {
    const ctx = useContext(workflow_state_context);
    if (!ctx) {
        throw new Error('useWorkflowState 必须在 Workflow 组件内使用');
    }
    return ctx;
}
