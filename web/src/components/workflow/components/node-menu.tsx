import { Menu } from "antd";
import type { ItemType } from "antd/es/menu/interface";
import { uuid } from '@/utils/id-gen';
import type { XYPosition } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useWorkflowState } from "../graph";
import type { DslNodeType } from "@/generated/workflow-dsl";

interface node_menu_props {
    menuItems?: ItemType[];
    sourceId: string;
    sourceHandleId?: string | null;
    onClose?: () => void;
}

/**
 * 节点右侧连接菜单：新增节点（dispatch graph/add_node）+ 条件节点预置 IF/ELSE 分支边。
 */
export default function NodeMenu(props: node_menu_props) {
    const reactFlow = useReactFlow();
    const { dispatch } = useWorkflowState();

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
                const dslType = key as DslNodeType;
                const node_id = uuid();

                dispatch({
                    type: 'graph/add_node',
                    node: { id: node_id, type: dslType },
                    position: find_optimal_position(),
                });

                if (dslType === 'CONDITION') {
                    const if_id = uuid();
                    const else_id = uuid();
                    dispatch({
                        type: 'graph/set_condition_edges',
                        source: node_id,
                        edges: [
                            { id: if_id, source: node_id, sourceHandle: if_id, target: '', condition: { branchType: 'IF', logicOperator: 'AND', conditions: [] } },
                            { id: else_id, source: node_id, sourceHandle: else_id, target: '', condition: { branchType: 'ELSE' } },
                        ],
                    });
                }

                dispatch({
                    type: 'graph/connect_edge',
                    source: props.sourceId,
                    sourceHandle: props.sourceHandleId ?? undefined,
                    target: node_id,
                });

                props.onClose?.();
            }}
        />
    );
}
