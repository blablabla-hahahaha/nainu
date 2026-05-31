import {
    BaseEdge,
    type EdgeProps as XYFlowEdgeProps, getBezierPath, Position,
} from '@xyflow/react';
import {theme} from "antd";
type EdgeProps = XYFlowEdgeProps;

function offset(x: number, pos: Position | undefined): number {
    if (pos === Position.Right) return x - 7;
    if (pos === Position.Left) return x + 7;
    return x;
}

/**
 * 工作流 Bezier 边。
 */
export default function Edge(props: EdgeProps) {
    const { token } = theme.useToken();

    const [edgePath ] = getBezierPath({
        sourceX: offset(props.sourceX, props.sourcePosition),
        sourceY: props.sourceY,
        sourcePosition: props.sourcePosition ?? Position.Right,
        targetX: offset(props.targetX, props.targetPosition),
        targetY: props.targetY,
        targetPosition: props.targetPosition ?? Position.Left,
    });
    return (
        <g>
            <BaseEdge
                id={props.id}
                path={edgePath}
                style={{
                    stroke: props.selected ? token.colorPrimary : token.colorBorder,
                    strokeWidth: '.09rem'
                }}
            />
        </g>
    );
}
