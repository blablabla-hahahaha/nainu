/**
 * 工作流状态上下文：受控组件的 state + dispatch 下发给画布子树与右侧检查器设置卡片。
 * 由页面统一提供（画布与节点设置/事件日志卡片共享同一 state + dispatch）；
 * 设置卡片与画布经 useWorkflowState 读写，不再直连 React Flow store。
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
 * 读取工作流状态上下文；必须在提供 workflow_state_context 的父级内使用。
 */
export function useWorkflowState(): workflow_state_context_value {
    const ctx = useContext(workflow_state_context);
    if (!ctx) {
        throw new Error('useWorkflowState 必须在提供 workflow_state_context 的父级内使用');
    }
    return ctx;
}
