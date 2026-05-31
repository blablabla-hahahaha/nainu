import type { CSSProperties, ReactNode } from 'react';
import { theme } from 'antd';
import type { NodeProps as XYFlowNodeProps } from "@xyflow/react";
import type { ItemType } from "antd/es/menu/interface";
import { create_node_status_styles } from './status';
import type { node_status, node_status_type } from './status';

/**
 * 工作流节点通用 Props。
 */
export interface node_props extends XYFlowNodeProps {
    children?: React.ReactNode;
    icon?: React.ReactNode;
    name?: string;
    menuItems?: ItemType[];
    menuSlot?: (props: { sourceId: string; sourceHandleId?: string | null; onClose: () => void }) => ReactNode;
    status?: node_status;
}

/**
 * use_node_styles 返回的样式集合。
 */
export interface node_styles_bundle {
    by_type: ReturnType<typeof create_node_status_styles>;
    token: ReturnType<typeof theme.useToken>['token'];
}

/**
 * 钩子：根据主题 token 生成节点状态样式。
 */
export function useNodeStyles(): node_styles_bundle {
    const { token } = theme.useToken();
    return {
        by_type: create_node_status_styles(token),
        token,
    };
}

type node_status_style_map = Record<node_status_type, ReturnType<typeof create_node_status_styles>[node_status_type]>;

/**
 * 纯函数：合并状态、边框、选中态生成最终节点样式。
 */
export function build_node_style(
    status: node_status | undefined,
    data_status: node_status | undefined,
    by_type: node_status_style_map,
    selected: boolean,
    dragging: boolean,
): CSSProperties {
    const effective = status || data_status;
    const status_type = effective?.type || 'default';
    const status_style = by_type[status_type];
    return {
        backgroundColor: status_style.color.background,
        boxShadow: `0 2px 8px ${status_style.color.boxShadow}30, 0 1px 3px ${status_style.color.boxShadow}20`,
        border: `${status_style.borderWidth}px ${status_style.borderStyle} ${selected && !dragging ? status_style.color.border : 'transparent'}`,
        color: status_style.color.text,
    };
}
