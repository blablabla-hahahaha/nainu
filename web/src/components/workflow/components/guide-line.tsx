import { useViewport } from "@xyflow/react";
import {theme} from "antd";

/**
 * GuideLine Props。
 */
export interface guide_line_props {
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
}

/**
 * 拖拽对齐参考线（SVG）。
 */
export default function GuideLine({ x1 = 0, y1 = 0, x2 = 0, y2 = 0 }: guide_line_props) {
    const { x, y, zoom } = useViewport();
    const { token } = theme.useToken();
    return (
        <svg
            id="guide-line"
            style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 10,
            }}
        >
            <line
                x1={x + x1 * zoom}
                y1={y + y1 * zoom}
                x2={x + x2 * zoom}
                y2={y + y2 * zoom}
                stroke={token.colorPrimary}
                strokeWidth={1}
            />
        </svg>
    )
}
