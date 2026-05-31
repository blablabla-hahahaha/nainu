import {Position} from '@xyflow/react';
import { default as LeftHandle } from "../components/left-handle";
import { default as Node } from '../components/node';
import type { node_props } from '../components/node-types';

/**
 * 结束节点。
 */
export default function End(props: node_props) {
    return (
        <Node {...props} name="结束">
            <LeftHandle type="target" position={Position.Left}/>
        </Node>
    );
}
