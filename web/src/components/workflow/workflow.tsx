import { useCallback, useState, useMemo } from 'react';
import { theme } from "antd";
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    addEdge,
    useNodesState,
    useEdgesState,
    applyNodeChanges,
    type Node,
    type Edge,
    type NodeSelectionChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { default as GuideLine } from "./components/guide-line";
import { default as Controls } from "./components/controls";
import { NodeSettingProvider, useWorkflowChanges } from "./components";
import type { guide_lines } from "./components/use-snap-guide";
import { useWorkflowGraph } from "./graph/use-workflow-graph";
import { fromGraph } from "./graph/serialize";
import type { workflow_graph } from "./graph/types";
import type { node_registry } from "./nodes";

interface workflow_props {
    registry: node_registry;
    graph: workflow_graph;
    onGraphChange: (graph: workflow_graph) => void;
}

type selection_state =
    | { type: 'none' }
    | { type: 'node'; nodeId: string; node: Node }
    | { type: 'edge'; edgeId: string };

/**
 * 工作流编辑器主组件（ReactFlow 画布 + 节点 + 边）。
 */
export default function Workflow(props: workflow_props) {
    const { token } = theme.useToken();
    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => fromGraph(props.graph), [props.graph]);
    const [nodes, setNodes] = useNodesState(initialNodes);
    const [edges, setEdges] = useEdgesState(initialEdges);
    const [horizontalGuideLines, setHorizontalGuideLines] = useState<guide_lines>({});
    const [verticalGuideLines, setVerticalGuideLines] = useState<guide_lines>({});
    const [selection, setSelection] = useState<selection_state>({ type: 'none' });

    const guide = useMemo(() => ({
        setHorizontal: setHorizontalGuideLines,
        setVertical: setVerticalGuideLines,
    }), []);

    const { onNodesChange, onEdgesChange } = useWorkflowChanges(
        nodes, edges,
        setNodes, setEdges,
        guide,
    );

    useWorkflowGraph({
        nodes,
        edges,
        onGraphChange: props.onGraphChange,
    });

    const { nodeTypes, edgeTypes, nodeSettingTypes } = props.registry;

    const on_open_node_setting = useCallback((_: React.MouseEvent, node: Node) => {
        setSelection({ type: 'node', nodeId: node.id, node });
    }, []);

    const on_close_node_setting = useCallback(() => {
        setSelection(current => {
            if (current.type === 'node') {
                setNodes((nds) => {
                    const change: NodeSelectionChange = {
                        id: current.nodeId,
                        type: 'select',
                        selected: false,
                    };
                    return applyNodeChanges([change], nds);
                });
            }
            return { type: 'none' };
        });
    }, [setNodes]);

    const on_edge_click = useCallback((_: React.MouseEvent, edge: Edge) => {
        setSelection({ type: 'edge', edgeId: edge.id });
    }, []);

    return (
        <ReactFlowProvider>
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={(params) => setEdges((els) => {
                        // 检查是否已有相同 source+sourceHandle 的悬挂边（target 为空）
                        const existingIdx = els.findIndex(
                            e => e.source === params.source
                                && e.sourceHandle === params.sourceHandle
                                && e.target === ''
                        );
                        if (existingIdx >= 0) {
                            // 更新现有悬挂边为目标连接
                            const updated = [...els];
                            updated[existingIdx] = {
                                ...updated[existingIdx],
                                target: params.target,
                                targetHandle: params.targetHandle ?? undefined,
                                hidden: false,
                            };
                            return updated;
                        }
                        // 正常创建新边
                        return addEdge(params, els);
                    })}
                    onNodeClick={on_open_node_setting}
                    onEdgeClick={on_edge_click}
                    onPaneClick={() => {
                        setSelection({ type: 'none' });
                    }}
                    defaultEdgeOptions={{ type: 'edge' }}
                    fitView
                >
                    <Background
                        gap={8}
                        color={token.colorFill}
                        bgColor={token.colorBgLayout}
                    />
                    <Controls />
                    <GuideLine {...horizontalGuideLines} />
                    <GuideLine {...verticalGuideLines} />
                </ReactFlow>
                <NodeSettingProvider
                    node={selection.type === 'node' ? selection.node : null}
                    onClose={on_close_node_setting}
                    nodeSettingTypes={nodeSettingTypes}
                />
            </div>
        </ReactFlowProvider>
    );
}
