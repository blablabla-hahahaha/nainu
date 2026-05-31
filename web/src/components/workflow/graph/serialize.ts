import type { graph_node, graph_edge, workflow_graph } from './types';
import type { Node, Edge } from '@xyflow/react';

export function toGraph(nodes: Node[], edges: Edge[]): workflow_graph {
    const serializedNodes: graph_node[] = nodes.map((node) => ({
        id: node.id,
        type: node.type || 'default',
        data: node.data,
    }));

    const serializedEdges: graph_edge[] = edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
        data: edge.data as Record<string, unknown>,
    }));

    return {
        nodes: serializedNodes,
        edges: serializedEdges,
    };
}

export function fromGraph(
    graph: workflow_graph,
    existingNodes?: Node[],
    existingEdges?: Edge[],
): { nodes: Node[]; edges: Edge[] } {
    const existingPositions = new Map<string, { x: number; y: number }>();
    existingNodes?.forEach((node) => {
        if (node.position) {
            existingPositions.set(node.id, {
                x: node.position.x,
                y: node.position.y,
            });
        }
    });

    let newNodeIndex = 0;
    const nodes: Node[] = graph.nodes.map((graphNode) => {
        const existingPosition = existingPositions.get(graphNode.id);
        const nodeType = graphNode.type;

        const node: Node<Record<string, unknown>> = {
            id: graphNode.id,
            type: nodeType,
            data: graphNode.data,
            position: existingPosition || {
                x: 100 + newNodeIndex * 50,
                y: 100 + newNodeIndex * 30,
            },
        };

        if (!existingPosition) {
            newNodeIndex++;
        }

        return node;
    });

    const existingEdgeIds = new Set<string>();
    existingEdges?.forEach((edge) => {
        existingEdgeIds.add(edge.id);
    });

    const edges: Edge[] = graph.edges.map((graphEdge) => ({
        id: graphEdge.id,
        source: graphEdge.source,
        target: graphEdge.target,
        sourceHandle: graphEdge.sourceHandle,
        targetHandle: graphEdge.targetHandle,
        type: 'edge',
        data: graphEdge.data,
        hidden: !graphEdge.target,
    }));

    return { nodes, edges };
}
