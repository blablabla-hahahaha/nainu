import { useCallback, useState, useMemo } from 'react';
import type { Dispatch, MouseEvent } from 'react';
import { theme } from "antd";
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    type Node,
    type Edge,
    type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { default as GuideLine } from "./components/guide-line";
import { default as Controls } from "./components/controls";
import { NodeSettingProvider, useWorkflowChanges } from "./components";
import type { guide_lines } from "./components/use-snap-guide";
import { from_canonical } from "./graph";
import { workflow_state_context } from "./graph";
import type { workflow_state } from "./graph";
import type { workflow_action } from "./graph/reducer";
import type { node_registry } from "./nodes";

interface workflow_props {
    registry: node_registry;
    state: workflow_state;
    dispatch: Dispatch<workflow_action>;
}

type selection_state =
    | { type: 'none' }
    | { type: 'node'; nodeId: string; node: Node }
    | { type: 'edge'; edgeId: string };

/**
 * 工作流编辑器主组件（受控）：canonical/view/runtime 三切片由父级持有，
 * 本组件只做 ReactFlow 投影与变更派发。画布子树与设置面板经
 * workflow_state_context 读写状态。
 */
export default function Workflow(props: workflow_props) {
    const { registry, state, dispatch } = props;
    const { token } = theme.useToken();
    const { nodes, edges } = useMemo(
        () => from_canonical(state.graph, state.view, state.runtime),
        [state.graph, state.view, state.runtime],
    );
    const [horizontalGuideLines, setHorizontalGuideLines] = useState<guide_lines>({});
    const [verticalGuideLines, setVerticalGuideLines] = useState<guide_lines>({});
    const [selection, setSelection] = useState<selection_state>({ type: 'none' });

    const guide = useMemo(() => ({
        setHorizontal: setHorizontalGuideLines,
        setVertical: setVerticalGuideLines,
    }), []);

    const { onNodesChange, onEdgesChange } = useWorkflowChanges(nodes, edges, dispatch, guide);

    const { nodeTypes, edgeTypes, nodeSettingTypes } = registry;

    const on_open_node_setting = useCallback((_: MouseEvent, node: Node) => {
        setSelection({ type: 'node', nodeId: node.id, node });
    }, []);

    const on_close_node_setting = useCallback(() => {
        setSelection({ type: 'none' });
    }, []);

    const on_edge_click = useCallback((_: MouseEvent, edge: Edge) => {
        setSelection({ type: 'edge', edgeId: edge.id });
    }, []);

    const on_connect = useCallback((params: Connection) => {
        dispatch({
            type: 'graph/connect_edge',
            source: params.source,
            sourceHandle: params.sourceHandle ?? undefined,
            target: params.target,
        });
    }, [dispatch]);

    return (
        <workflow_state_context.Provider value={{ state, dispatch }}>
            <ReactFlowProvider>
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={on_connect}
                        onNodeClick={on_open_node_setting}
                        onEdgeClick={on_edge_click}
                        onPaneClick={() => { setSelection({ type: 'none' }); }}
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
        </workflow_state_context.Provider>
    );
}
