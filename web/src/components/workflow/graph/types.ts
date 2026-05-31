export interface graph_node {
    id: string;
    type: string;
    data: Record<string, unknown>;
}

export interface graph_edge<T extends Record<string, unknown> = Record<string, unknown>> {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    data: T;
}

export interface workflow_graph {
    nodes: graph_node[];
    edges: graph_edge[];
}
