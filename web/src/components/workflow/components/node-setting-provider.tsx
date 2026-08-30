import type { node_settings_props, node_setting_types } from "./node-setting";

export type { node_settings_props, node_setting_types };

/**
 * NodeSettingProvider Props。
 */
export interface node_settings_provider_props {
    nodeId: string;
    nodeType: string;
    onClose: () => void;
    nodeSettingTypes: node_setting_types;
}

/**
 * 根据 node.type 动态加载对应 Settings 面板的 Provider（右侧检查器卡片区使用）。
 */
export function NodeSettingProvider({ nodeId, nodeType, onClose, nodeSettingTypes }: node_settings_provider_props) {
    const Content = nodeSettingTypes[nodeType];
    if (!Content) return null;

    return <Content key={nodeId} nodeId={nodeId} onClose={onClose} />;
}
