import { useCallback } from "react";
import type { ItemType } from "antd/es/menu/interface";
import type { ComponentType } from "react";
import type { node_props } from "../components/node-types";
import NodeMenu from "../components/node-menu";

interface node_wrapper_props extends node_props {
    node_component: ComponentType<node_props>;
    menu_items: ItemType[];
}

export default function NodeWrapper({ node_component: NodeComponent, menu_items, ...props }: node_wrapper_props) {
    const menu_slot = useCallback((p: {sourceId: string; sourceHandleId?: string | null; onClose: () => void}) => (
        <NodeMenu menuItems={menu_items} sourceId={p.sourceId} sourceHandleId={p.sourceHandleId} onClose={p.onClose} />
    ), [menu_items]);

    return <NodeComponent {...props} menuItems={menu_items} menuSlot={menu_slot} />;
}
