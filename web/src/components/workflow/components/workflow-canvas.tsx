import { useCallback, useMemo, useRef, useState } from 'react';
import type { Dispatch, MouseEvent } from 'react';
import { theme } from 'antd';
import {
    ReactFlow,
    Background,
    useStore,
    type Node,
    type Edge,
    type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { default as GuideLine } from './guide-line';
import { default as Controls } from './controls';
import { NodeSettingProvider, useWorkflowChanges } from '.';
import type { guide_lines } from './use-snap-guide';
import { project_stable } from '../graph';
import type { workflow_state, projection_cache } from '../graph';
import type { workflow_action } from '../graph/reducer';
import type { node_registry } from '../nodes';
import { run_result_context } from './run-result-context';

interface workflow_canvas_props {
    registry: node_registry;
    state: workflow_state;
    dispatch: Dispatch<workflow_action>;
}

type selection_state =
    | { type: 'none' }
    | { type: 'node'; nodeId: string; node: Node }
    | { type: 'edge'; edgeId: string };

/**
 * 受控画布主体（在 ReactFlowProvider 内）：做三切片→ReactFlow 稳定投影，
 * 经 useStore 读取 nodeLookup 缓存节点已测尺寸，保证拖拽不闪烁；画布事件派发回 reducer。
 */
export default function WorkflowCanvas({ registry, state, dispatch }: workflow_canvas_props) {
    const { token } = theme.useToken();
    const node_lookup = useStore((s) => s.nodeLookup);
    const projection_cache_ref = useRef<projection_cache>({ nodes: new Map(), edges: new Map() });
    const [horizontalGuideLines, setHorizontalGuideLines] = useState<guide_lines>({});
    const [verticalGuideLines, setVerticalGuideLines] = useState<guide_lines>({});
    const [selection, setSelection] = useState<selection_state>({ type: 'none' });
    const [top_node_id, set_top_node_id] = useState<string | null>(null);

    const activate_node = useCallback((node_id: string) => {
        set_top_node_id(node_id);
    }, []);

    const run_result_value = useMemo(
        () => ({ top_node_id, activate_node }),
        [top_node_id, activate_node],
    );

    const { nodes, edges } = useMemo(
        () => project_stable(state.graph, state.view, state.runtime, projection_cache_ref.current, node_lookup, top_node_id),
        [state.graph, state.view, state.runtime, node_lookup, top_node_id],
    );

    const guide = useMemo(() => ({
        setHorizontal: setHorizontalGuideLines,
        setVertical: setVerticalGuideLines,
    }), []);

    const { onNodesChange, onEdgesChange } = useWorkflowChanges(nodes, edges, dispatch, guide);

    const { nodeTypes, edgeTypes, nodeSettingTypes } = registry;

    const on_open_node_setting = useCallback((_: MouseEvent, node: Node) => {
        setSelection({ type: 'node', nodeId: node.id, node });
        set_top_node_id(node.id);
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
        <run_result_context.Provider value={run_result_value}>
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
        </run_result_context.Provider>
    );
}
