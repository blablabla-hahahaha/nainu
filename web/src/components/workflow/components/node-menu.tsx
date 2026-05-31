import { Menu } from "antd";
import type { ItemType } from "antd/es/menu/interface";
import { uuid } from '@/utils/id-gen';
import type { XYPosition } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import type { graph_node, graph_edge } from "../graph/types";

interface node_menu_props {
    menuItems?: ItemType[];
    sourceId: string;
    sourceHandleId?: string | null;
    onClose?: () => void;
}

/**
 * 节点右侧连接菜单（新增/分支节点）。
 */
export default function NodeMenu(props: node_menu_props) {
    const reactFlow = useReactFlow();

    const find_optimal_position = (): XYPosition => {
        const node = reactFlow.getNode(props.sourceId);
        if (!node) {
            return { x: 300, y: 0 };
        }
        const position = node.position;
        const node_width = node.measured?.width || 200;
        const node_height = node.measured?.height || 60;

        const edges = reactFlow.getEdges().filter(e => e.source === props.sourceId);
        let max_bottom_y = position.y;

        for (const edge of edges) {
            const target_node = reactFlow.getNode(edge.target);
            if (target_node) {
                const target_bottom = target_node.position.y + (target_node.measured?.height || node_height);
                if (target_bottom > max_bottom_y) {
                    max_bottom_y = target_bottom + 20;
                }
            }
        }

        return {
            x: position.x + node_width + 50,
            y: max_bottom_y,
        };
    };

    return (
        <Menu
            style={{
                width: '400px',
                height: '800px',
                border: 'none',
            }}
            selectedKeys={[]}
            items={props.menuItems}
            onClick={({ key }) => {
                const node = props.menuItems?.find((item) => item?.key === key)
                const node_id = uuid();

                const graphNode: graph_node = {
                    id: node_id,
                    type: node?.key?.toString() || '',
                    data: {
                        label: node?.type !== 'divider' ? node?.label : undefined,
                    },
                };

                const graphEdge: graph_edge = {
                    id: uuid(),
                    source: props.sourceId,
                    sourceHandle: props.sourceHandleId || undefined,
                    target: node_id,
                    data: {},
                };

                reactFlow.addNodes([{ ...graphNode, position: find_optimal_position() }]);
                reactFlow.addEdges([{ ...graphEdge, type: 'edge' }]);
                props.onClose?.();
            }}
        />
    );
}
