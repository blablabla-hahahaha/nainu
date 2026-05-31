import { Position } from '@xyflow/react';
import { default as LeftHandle } from "@/components/workflow/components/left-handle";
import { default as RightHandle } from "@/components/workflow/components/right-handle";
import { default as Node } from "@/components/workflow/components/node";
import type { node_props } from "@/components/workflow/components/node-types";

/**
 * 输出节点。
 */
export default function OutputNode(props: node_props) {
    return (
        <Node {...props}>
            <LeftHandle type="target" position={Position.Left} />
            <RightHandle
                type="source"
                position={Position.Right}
                menuSlot={props.menuSlot}
                nodeId={props.id}
            />
        </Node>
    );
}
