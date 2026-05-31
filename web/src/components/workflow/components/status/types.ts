import type { ReactNode } from 'react';

/**
 * 节点状态枚举（default/wait/runnable/...）。
 */
export type node_status_type =
    | 'default'
    | 'wait'
    | 'runnable'
    | 'suspended'
    | 'failed'
    | 'success'
    | 'paused';

/**
 * 单状态的颜色 + 边框 + 动画。
 */
export interface node_status_style {
    label: string;
    color: {
        primary: string;
        border: string;
        background: string;
        text: string;
        boxShadow: string;
    };
    icon?: ReactNode;
    animation?: 'spin' | 'pulse' | 'none';
    borderStyle: 'solid' | 'dashed';
    borderWidth: number;
}

/**
 * 节点 runtime 状态（type/message 等）。
 */
export interface node_status {
    type: node_status_type;
    message?: string;
    duration?: number;
}
