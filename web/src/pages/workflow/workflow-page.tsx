import { default as Workflow } from "@/components/workflow/workflow";
import { create_registry, create_default_registry, create_generic_node_icon } from "@/components/workflow/nodes";
import { theme } from "antd";
import type { workflow_graph } from "@/components/workflow/graph/types";
import { default as OutputNode } from "./nodes/output/output-node";
import { default as Condition } from "./nodes/condition/condition-node";
import { default as ConditionSettings } from "./nodes/condition/condition-settings";
import { default as OutputSettings } from "./nodes/output/output-settings";

const page_canvas_style = {
    position: 'absolute' as const,
    height: 'calc(100vh - 56px)',
    width: '100%',
    right: 0,
    top: 0,
} as const

/**
 * 工作流编辑器示例页。
 */
export default function WorkflowPage() {
    const { token } = theme.useToken();

    const default_registry = create_default_registry(token);

    const initial_graph: workflow_graph = {
        nodes: [
            {
                id: 'start',
                type: 'start',
                data: {
                    label: '开始',
                },
            },
        ],
        edges: [],
    };

    const custom_registry = create_registry([
        ...default_registry.entries,
        {
            type: 'CONDITION',
            label: '条件分支',
            icon: create_generic_node_icon(token.colorPrimary),
            node: Condition,
            nodeSettings: ConditionSettings,
        },
        {
            type: 'OUTPUT',
            label: '指定输出',
            icon: create_generic_node_icon(token.colorPrimary),
            node: OutputNode,
            nodeSettings: OutputSettings,
        },
    ]);

    return (
        <div style={page_canvas_style}>
            <Workflow
                registry={custom_registry}
                graph={initial_graph}
                onGraphChange={(graph) => {
                    console.log('Graph changed:', graph);
                }}
            />
        </div>
    );
}
