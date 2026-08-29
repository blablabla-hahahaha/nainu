import {Position, useEdges} from '@xyflow/react';
import { default as LeftHandle } from '@/components/workflow/components/left-handle';
import { default as RightHandle } from '@/components/workflow/components/right-handle';
import { default as Node } from '@/components/workflow/components/node';
import type { node_props } from '@/components/workflow/components/node-types';
import { condition_to_branch } from './condition-operator';
import type { graph_condition } from '@/components/workflow/graph/types';
import {Flex, theme} from "antd";
import BranchOperatorView from "@/pages/workflow/nodes/condition/branch-operator-view.tsx";

/**
 * 条件分支节点：分支从出边（typed conditional edge）的 canonical condition 读取，纯渲染。
 */
export default function ConditionNode(props: node_props) {
    const { token } = theme.useToken();
    const sourceEdges = useEdges().filter(e => e.source === props.id);

    return (
        <Node {...props}>
            <LeftHandle type="target" position={Position.Left}/>

            <Flex vertical gap="small" style={{ marginTop: 12, position: 'relative', minWidth: 160 }}>
                {sourceEdges.map((edge, index) => {
                    const data = (edge.data ?? {}) as { condition?: graph_condition };
                    if (!data.condition) {
                        return null;
                    }
                    const branch = condition_to_branch(data.condition);
                    return (
                        <Flex key={edge.id} vertical gap={2} style={{ position: 'relative' }}>
                            <Flex justify="space-between" align="center" style={{ position: 'relative' }}>
                                <span style={{
                                    color: token.colorTextTertiary,
                                    fontWeight: 'bold',
                                    fontSize: 10,
                                }}>CASE {index + 1}</span>
                                <span style={{
                                    color: token.colorText,
                                    fontWeight: 'bold',
                                    fontSize: 10,
                                }}>{branch.type}</span>
                                <RightHandle
                                    type="source"
                                    position={Position.Right}
                                    id={edge.sourceHandle ?? edge.id}
                                    menuSlot={props.menuSlot}
                                    nodeId={props.id}
                                    style={{ right: '-12px' }}
                                />
                            </Flex>
                            {branch.compares && branch.compares.length > 0 && (
                                <BranchOperatorView branch={branch} />
                            )}
                        </Flex>
                    );
                })}
            </Flex>
        </Node>
    );
}
