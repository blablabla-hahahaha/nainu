import { Position } from '@xyflow/react';
import { default as LeftHandle } from "@/components/workflow/components/left-handle";
import { default as RightHandle } from "@/components/workflow/components/right-handle";
import { default as Node } from "@/components/workflow/components/node";
import type { node_props } from "@/components/workflow/components/node-types";

/**
 * 编码（SCRIPT）节点：可连入上游、连出下游；脚本经独立沙箱服务执行。
 */
export default function ScriptNode(props: node_props) {
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
