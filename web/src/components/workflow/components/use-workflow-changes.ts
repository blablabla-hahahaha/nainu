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
 * start 不可删；位置变化经吸附后派发 view/move_node；选择变化派发 view/select_nodes。
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

    /**
     * 受控选择态：React Flow 在受控模式下只经 onNodesChange 派发 select 变更，
     * 不落 store（内部仅就地改 nodeLookup，不触发订阅），故需在此累积选择集，
     * 再派发 view/select_nodes 把 selected 落到受控节点上——否则删除热键
     * （nodes.filter(selected)）无从命中。选择态是纯 UI 状态，不入 canonical 图。
     */
    const selected_ids_ref = useRef<Set<string>>(new Set());

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

        let selection_changed = false;
        for (const change of filtered) {
            if (change.type === 'remove') {
                selected_ids_ref.current.delete(change.id);
                dispatch({ type: 'graph/remove_node', nodeId: change.id });
            } else if (change.type === 'position' && change.position) {
                dispatch({
                    type: 'view/move_node',
                    nodeId: change.id,
                    position: apply_snap_to_change(change).position ?? change.position,
                });
            } else if (change.type === 'select') {
                if (change.selected) {
                    selected_ids_ref.current.add(change.id);
                } else {
                    selected_ids_ref.current.delete(change.id);
                }
                selection_changed = true;
            }
        }

        if (selection_changed) {
            dispatch({ type: 'view/select_nodes', nodeIds: [...selected_ids_ref.current] });
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
