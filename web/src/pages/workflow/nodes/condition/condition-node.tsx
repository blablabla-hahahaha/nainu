import {Position, useEdges, useReactFlow} from '@xyflow/react';
import { default as LeftHandle } from '@/components/workflow/components/left-handle';
import { default as RightHandle } from '@/components/workflow/components/right-handle';
import { default as Node } from '@/components/workflow/components/node';
import type { node_props } from '@/components/workflow/components/node-types';
import {
    branch_operator_definition_support,
    type branch_operator_definition,
} from './condition-operator';
import {Flex, theme} from "antd";
import BranchOperatorView from "@/pages/workflow/nodes/condition/branch-operator-view.tsx";
import {uuid} from "@/utils/id-gen.ts";
import {useEffect} from "react";

function normalize_branch_from_edge(edge: { data?: unknown }): branch_operator_definition | null {
    const edgeData = (edge.data ?? {}) as Record<string, unknown>;
    if (edgeData.type === undefined && edgeData.branchType === undefined) {
        return null;
    }
    return branch_operator_definition_support.normalize(edge.data);
}

/**
 * 条件分支节点（Start / IF 分支 / ELSE 分支）。
 * 分支数据从 sourceEdges 的 edge.data 读取，按数组索引确定顺序。
 */
export default function ConditionNode(props: node_props) {
    const { token } = theme.useToken();
    const reactFlow = useReactFlow();
    const sourceEdges = useEdges().filter(e => e.source === props.id);

    // 初始化
    useEffect(() => {
        reactFlow.setEdges((edges) => {
            if (edges.some((e) => e.source === props.id)) {
                return edges;
            }

            const ifDef = branch_operator_definition_support.getIfDefinition();
            const elseDef = branch_operator_definition_support.getElseDefinition();

            return [
                ...edges,
                { id: uuid(), source: props.id, sourceHandle: uuid(), target: '', type: 'edge', data: ifDef },
                { id: uuid(), source: props.id, sourceHandle: uuid(), target: '', type: 'edge', data: elseDef },
            ]
        });
    }, [props.id, reactFlow]);

    // 分支直接从 edge.data 读取，按数组索引排序
    const branches: branch_operator_definition[] = sourceEdges
        .map(edge => normalize_branch_from_edge(edge))
        .filter((b): b is branch_operator_definition => b !== null);

    return (
        <Node {...props}>
            <LeftHandle type="target" position={Position.Left}/>

            <Flex vertical gap="small" style={{ marginTop: 12, position: 'relative', minWidth: 160 }}>
                {sourceEdges.map((edge, index) => {
                    const branch = branches[index];
                    return (
                        <Flex key={edge.id} vertical gap={2} style={{ position: 'relative' }}>
                            <Flex justify="space-between" align="center" style={{ position: 'relative' }}>
                                <span style={{
                                    color: token.colorTextTertiary,
                                    fontWeight: 'bold',
                                    fontSize: 10,
                                }}>CASE {index + 1}</span>
                                {branch && (
                                    <span style={{
                                        color: token.colorText,
                                        fontWeight: 'bold',
                                        fontSize: 10,
                                    }}>{branch.type}</span>
                                )}
                                <RightHandle
                                    type="source"
                                    position={Position.Right}
                                    id={edge.id}
                                    menuSlot={props.menuSlot}
                                    nodeId={props.id}
                                    style={{ right: '-12px' }}
                                />
                            </Flex>
                            {branch?.compares && (
                                <BranchOperatorView branch={branch} />
                            )}
                        </Flex>
                    );
                })}
            </Flex>
        </Node>
    );
}
