import type { NodeTypes, EdgeTypes } from "@xyflow/react";
import type { ReactNode, ComponentType } from "react";
import type { node_props } from "../components/node-types";
import type { node_settings_props, node_setting_types } from "../components/node-setting";
import type { ant_design_token_ref } from "../components/status";
import type { DslNodeType } from "@/generated/workflow-dsl";

export interface node_registry_entry {
    /**
     * DSL 节点类型（与后端 NodeType 唯一对齐）。
     */
    type: DslNodeType;
    label: string;
    icon: ReactNode;
    node: ComponentType<node_props>;
    nodeSettings?: ComponentType<node_settings_props>;
    deletable?: boolean;
    connectable?: boolean;
}

export interface node_registry {
    nodeTypes: NodeTypes;
    edgeTypes: EdgeTypes;
    nodeSettingTypes: node_setting_types;
    menuItems: { key: string; label: string; icon: ReactNode; type: 'item' }[];
    entries: node_registry_entry[];
    deletableTypes: Record<string, boolean>;
    connectableTypes: Record<string, boolean>;
}

export type node_registry_build_params = {
    token: ant_design_token_ref;
};
