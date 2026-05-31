import {Position} from '@xyflow/react';
import { default as RightHandle } from "../components/right-handle";
import { default as Node } from '../components/node';
import type { node_props } from '../components/node-types';

/**
 * 开始节点。
 */
export default function Start(props: node_props) {
    return (
        <Node {...props} name="开始">
            <RightHandle
                type="source"
                position={Position.Right}
                menuSlot={props.menuSlot}
                nodeId={props.id}
            />
        </Node>
    );
}
