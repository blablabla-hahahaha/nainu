import type { Node } from "@xyflow/react";
import type { node_settings_props, node_setting_types } from "./node-setting";

export type { node_settings_props, node_setting_types };

/**
 * NodeSettingProvider Props。
 */
export interface node_settings_provider_props {
    node: Node | null;
    onClose: () => void;
    nodeSettingTypes: node_setting_types;
}

/**
 * 根据 node.type 动态加载对应 Settings 面板的 Provider。
 */
export function NodeSettingProvider({ node, onClose, nodeSettingTypes }: node_settings_provider_props) {
    if (!node) return null;

    const Content = node.type ? nodeSettingTypes[node.type] : undefined;
    if (!Content) return null;

    return <Content key={node.id} nodeId={node.id} onClose={onClose} />;
}
