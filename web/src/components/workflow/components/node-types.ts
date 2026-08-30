import type { CSSProperties, ReactNode } from 'react';
import { theme } from 'antd';
import type { NodeProps as XYFlowNodeProps } from "@xyflow/react";
import type { ItemType } from "antd/es/menu/interface";
import { create_node_status_styles } from './status';
import type { node_status, node_status_style } from './status';

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

/**
 * 纯函数：节点外壳恒用默认样式（背景/阴影），边框颜色由调用方给（状态色或透明/选中态）。
 * 边框宽度/样式恒定，改变边框颜色不改变节点尺寸。
 */
export function build_node_style(
    base: node_status_style,
    borderColor: string,
): CSSProperties {
    return {
        backgroundColor: base.color.background,
        boxShadow: `0 2px 8px ${base.color.boxShadow}30, 0 1px 3px ${base.color.boxShadow}20`,
        border: `${base.borderWidth}px ${base.borderStyle} ${borderColor}`,
        color: base.color.text,
    };
}
