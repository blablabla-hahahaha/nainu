import { useCallback, useRef } from 'react';
import type { Dispatch } from 'react';
import type { NodeChange, EdgeChange, Node, Edge } from '@xyflow/react';
import { useSnapGuide, type guide_line_payload } from './use-snap-guide';
import type { workflow_action } from '../graph/reducer';

const START_NODE_TYPE = 'START';

const is_start = (type?: string) => type === START_NODE_TYPE;

interface guide_setters {
    setHorizontal: (v: guide_line_payload) => void;
    setVertical: (v: guide_line_payload) => void;
}

/**
 * 钩子：把 ReactFlow Nodes/Edges onChange 翻译为 reducer 动作（受控化）。
 * start 不可删；位置变化经吸附后派发 view/move_node；其余派发对应图变更。
 */
export function useWorkflowChanges(
    nodes: Node[],
    _edges: Edge[],
    dispatch: Dispatch<workflow_action>,
    guide: guide_setters,
) {
    const { apply_snap_to_change, reset_guide_lines } = useSnapGuide(
        nodes,
        guide.setHorizontal,
        guide.setVertical,
    );

    const nodes_ref = useRef(nodes);
    nodes_ref.current = nodes;

    const onNodesChange = useCallback((changes: NodeChange<Node>[]) => {
        const has_live_drag = changes.some((c) => c.type === 'position' && c.dragging);
        if (!has_live_drag) {
            reset_guide_lines();
        }

        const filtered = changes.filter(change => {
            if (change.type !== 'remove') return true;
            const node = nodes_ref.current.find(n => n.id === change.id);
            return !is_start(node?.type);
        });

        for (const change of filtered) {
            if (change.type === 'remove') {
                dispatch({ type: 'graph/remove_node', nodeId: change.id });
            } else if (change.type === 'position' && change.position) {
                dispatch({
                    type: 'view/move_node',
                    nodeId: change.id,
                    position: apply_snap_to_change(change).position ?? change.position,
                });
            }
        }
    }, [dispatch, apply_snap_to_change, reset_guide_lines]);

    const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
        for (const change of changes) {
            if (change.type === 'remove') {
                dispatch({ type: 'graph/remove_edge', edgeId: change.id });
            }
        }
    }, [dispatch]);

    return { onNodesChange, onEdgesChange };
}
