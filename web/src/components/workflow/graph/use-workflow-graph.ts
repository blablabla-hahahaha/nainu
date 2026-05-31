import { useRef, useCallback, useEffect, useState } from 'react';
import { toGraph } from './serialize';
import type { workflow_graph } from './types';
import type { Node, Edge } from '@xyflow/react';

interface use_workflow_graph_props {
    nodes: Node[];
    edges: Edge[];
    onGraphChange: (graph: workflow_graph) => void;
}

export function useWorkflowGraph({
    nodes,
    edges,
    onGraphChange,
}: use_workflow_graph_props) {
    const nodesRef = useRef<Node[]>(nodes);
    const edgesRef = useRef<Edge[]>(edges);
    const lastSentGraphRef = useRef<string>('');
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [changeCount, setChangeCount] = useState(0);

    nodesRef.current = nodes;
    edgesRef.current = edges;

    useEffect(() => {
        setChangeCount(prev => prev + 1);
    }, [nodes, edges]);

    const triggerOnGraphChange = useCallback(() => {
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;
        const graph = toGraph(currentNodes, currentEdges);
        const graphJson = JSON.stringify(graph);

        if (graphJson === lastSentGraphRef.current) {
            return;
        }

        lastSentGraphRef.current = graphJson;
        onGraphChange(graph);
    }, [onGraphChange]);

    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            triggerOnGraphChange();
        }, 150);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [changeCount, triggerOnGraphChange]);
}
