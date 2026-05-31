import type { NodeTypes, EdgeTypes } from "@xyflow/react";
import type { ReactNode } from "react";
import type { node_props } from "../components/node-types";
import type { node_setting_types } from "../components/node-setting";
import type { ant_design_token_ref } from "../components/status";
import Start from './start';
import End from './end';
import Edge from "../components/edge";
import { HomeOutlined } from "@ant-design/icons";
import { create_node_status_icons } from "../components/status";
import type { node_registry_entry, node_registry } from "./node-registry-types";
import NodeWrapper from "./node-wrapper";

function build_boolean_map(entries: node_registry_entry[], key: 'deletable' | 'connectable'): Record<string, boolean> {
    const map: Record<string, boolean> = {};
    for (const entry of entries) {
        map[entry.type] = entry[key] !== false;
    }
    return map;
}

export function create_registry(
    nodeEntries: node_registry_entry[],
    edgeEntries?: EdgeTypes
): node_registry {
    const node_types: NodeTypes = {};
    const node_setting_types: node_setting_types = {};
    const menu_items: { key: string; label: string; icon: ReactNode; type: 'item' }[] = [];

    nodeEntries.forEach(entry => {
        menu_items.push({
            key: entry.type,
            label: entry.label,
            icon: entry.icon,
            type: 'item' as const,
        });

        node_types[entry.type] = (props: node_props) => (
            <NodeWrapper node_component={entry.node} menu_items={menu_items} {...props} />
        );

        node_setting_types[entry.type] = entry.nodeSettings;
    });

    const default_edge_types: EdgeTypes = {
        edge: Edge,
    };

    return {
        nodeTypes: node_types,
        edgeTypes: { ...default_edge_types, ...edgeEntries },
        nodeSettingTypes: node_setting_types,
        menuItems: menu_items,
        entries: nodeEntries,
        deletableTypes: build_boolean_map(nodeEntries, 'deletable'),
        connectableTypes: build_boolean_map(nodeEntries, 'connectable'),
    };
}

export function create_default_registry(token: ant_design_token_ref): node_registry {
    const icons = create_node_status_icons(token);

    return create_registry([
        {
            type: 'start',
            label: '开始',
            icon: icons.start,
            node: Start,
            deletable: false,
            connectable: false,
        },
        {
            type: 'end',
            label: '结束',
            icon: icons.end,
            node: End,
        },
    ]);
}

export function create_generic_node_icon(color: string): ReactNode {
    return (
        <HomeOutlined style={{
            background: color,
            borderRadius: '6px',
            color: 'white',
            width: '22px',
            height: '22px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}/>
    );
}

export { create_node_status_icons };
