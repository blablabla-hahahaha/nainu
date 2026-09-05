import { useCallback, useMemo, useRef, useState } from 'react';
import type { Dispatch, MouseEvent } from 'react';
import { theme } from 'antd';
import {
    ReactFlow,
    Background,
    useStore,
    type Node,
    type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { default as GuideLine } from './guide-line';
import { default as Controls } from './controls';
import { useWorkflowChanges } from '.';
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
    /** 节点被点击（打开其设置卡片）时回调；由父级决定选中节点并渲染设置卡片。 */
    on_open_node: (node_id: string) => void;
    /** 画布空白处点击（关闭节点设置卡片）时回调。 */
    on_close_panel: () => void;
}

/**
 * 受控画布主体（在 ReactFlowProvider 内）：做三切片→ReactFlow 稳定投影，
 * 经 useStore 读取 nodeLookup 缓存节点已测尺寸，保证拖拽不闪烁；画布事件派发回 reducer。
 * 节点设置卡片不再由本组件内嵌渲染，改由页面右侧检查器渲染（经 on_open_node/on_close_panel 汇报选中）。
 */
export default function WorkflowCanvas({
    registry,
    state,
    dispatch,
    on_open_node,
    on_close_panel,
}: workflow_canvas_props) {
    const { token } = theme.useToken();
    const node_lookup = useStore((s) => s.nodeLookup);
    const projection_cache_ref = useRef<projection_cache>({ nodes: new Map(), edges: new Map() });
    const [horizontalGuideLines, setHorizontalGuideLines] = useState<guide_lines>({});
    const [verticalGuideLines, setVerticalGuideLines] = useState<guide_lines>({});
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

    const { nodeTypes, edgeTypes } = registry;

    const on_open_node_setting = useCallback((_: MouseEvent, node: Node) => {
        set_top_node_id(node.id);
        on_open_node(node.id);
    }, [on_open_node]);

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
                    onPaneClick={on_close_panel}
                    defaultEdgeOptions={{ type: 'edge' }}
                    // React Flow 默认以 Space 作为「按住平移」热键，并在 window 上监听 keydown；
                    // 它会拦截空白键，使右侧检查器里的编码编辑器（Monaco）无法输入空格。
                    // 关闭 Space 平移（拖拽平移仍可用），把空白键还给文本输入。
                    panActivationKeyCode={null}
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
            </div>
        </run_result_context.Provider>
    );
}
