import { useCallback } from 'react';
import {
    applyNodeChanges,
    applyEdgeChanges,
    type NodeChange,
    type EdgeChange,
    type Node,
    type Edge,
} from '@xyflow/react';
import { useSnapGuide, type guide_line_payload } from './use-snap-guide';

const START_NODE_ID = 'start';

const is_start = (type?: string) => type === START_NODE_ID;

interface guide_setters {
    setHorizontal: (v: guide_line_payload) => void;
    setVertical: (v: guide_line_payload) => void;
}

/**
 * 钩子：封装 ReactFlow Nodes/Edges onChange（start 不可删、start 连线不可删、吸附参考线）。
 */
export function useWorkflowChanges(
    nodes: Node[],
    edges: Edge[],
    setNodes: (fn: (nds: Node[]) => Node[]) => void,
    setEdges: (fn: (eds: Edge[]) => Edge[]) => void,
    guide: guide_setters,
) {
    const { apply_snap_to_change, reset_guide_lines } = useSnapGuide(
        nodes,
        guide.setHorizontal,
        guide.setVertical,
    );

    const onNodesChange = useCallback((changes: NodeChange<Node>[]) => {
        reset_guide_lines();

        const filtered_changes = changes.filter(change => {
            if (change.type !== 'remove') return true;
            const node_to_remove = nodes.find(n => n.id === change.id);
            return !is_start(node_to_remove?.type);
        });

        const new_changes: NodeChange<Node>[] = [];
        filtered_changes.forEach((change) => {
            if (change.type !== 'position') {
                new_changes.push(change);
                return;
            }
            if (!change.position) {
                new_changes.push(change);
                return;
            }
            new_changes.push(apply_snap_to_change(change));
        });

        setNodes((nds) => applyNodeChanges(new_changes, nds));
    }, [nodes, setNodes, apply_snap_to_change, reset_guide_lines]);

    const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
        const filtered_changes = changes.filter(change => {
            if (change.type !== 'remove') return true;
            const edge = edges.find(e => e.id === change.id);
            if (!edge) return true;
            const is_start_edge = edge.source === START_NODE_ID || edge.target === START_NODE_ID;
            const selected_nodes = nodes.filter(n => n.selected);
            const only_start_selected = selected_nodes.length === 1 && is_start(selected_nodes[0]?.type);
            const edge_not_selected = !selected_nodes.some(n => n.id === edge.id);
            return !(is_start_edge && only_start_selected && edge_not_selected);
        });
        setEdges((eds) => applyEdgeChanges(filtered_changes, eds));
    }, [edges, nodes, setEdges]);

    return { onNodesChange, onEdgesChange };
}
