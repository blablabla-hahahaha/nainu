import { useCallback, useRef } from 'react';
import type { Node } from '@xyflow/react';

/**
 * 参考线边界（x1/x2/y1/y2）。
 */
export interface guide_line_bounds {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}

/**
 * 拖拽对齐参考线 state。
 */
export interface snap_guide_state {
    horizontal: guide_line_bounds | null;
    vertical: guide_line_bounds | null;
}

/**
 * setState 入参类型。
 */
export type guide_line_payload = guide_line_bounds | Record<string, never>;

/**
 * 参考线坐标（与 guide_line_payload 兼容）。
 */
export type guide_lines = guide_line_payload;

/**
 * 纯函数：计算节点是否吸附到其他节点边缘（SNAP_THRESHOLD=6）。
 */
export function compute_snap_change(
    node_id: string,
    nodes: Node[],
    position: { x: number; y: number },
): { x: number; y: number; guide: snap_guide_state } {
    const SNAP_THRESHOLD = 6;
    let adsorb_y = position.y;
    let adsorb_x = position.x;
    let horizontal: guide_line_bounds | null = null;
    let vertical: guide_line_bounds | null = null;

    const build_bounds = (primary_axis: 'y' | 'x', primary: number): guide_line_bounds => {
        let x1 = Infinity;
        let x2 = -Infinity;
        let y1 = Infinity;
        let y2 = -Infinity;
        for (const other_node of nodes) {
            if (primary_axis === 'y' && other_node.position.y === primary) {
                x1 = Math.min(x1, other_node.position.x);
                x2 = Math.max(x2, other_node.position.x + (other_node.measured?.width || 0));
                y1 = Math.min(y1, other_node.position.y);
                y2 = Math.max(y2, other_node.position.y + (other_node.measured?.height || 0));
            }
            if (primary_axis === 'x' && other_node.position.x === primary) {
                x1 = Math.min(x1, other_node.position.x);
                x2 = Math.max(x2, other_node.position.x + (other_node.measured?.width || 0));
                y1 = Math.min(y1, other_node.position.y);
                y2 = Math.max(y2, other_node.position.y + (other_node.measured?.height || 0));
            }
        }
        if (primary_axis === 'y') {
            return { x1: Number.isFinite(x1) ? x1 : 0, x2: Number.isFinite(x2) ? x2 : 0, y1: primary, y2: primary };
        }
        return { x1: primary, x2: primary, y1: Number.isFinite(y1) ? y1 : 0, y2: Number.isFinite(y2) ? y2 : 0 };
    };

    for (const other_node of nodes) {
        if (other_node.id === node_id) continue;
        const delta_y = Math.abs(other_node.position.y - position.y);
        if (delta_y < SNAP_THRESHOLD) {
            adsorb_y = other_node.position.y;
            horizontal = build_bounds('y', adsorb_y);
            break;
        }
    }

    for (const other_node of nodes) {
        if (other_node.id === node_id) continue;
        const delta_x = Math.abs(other_node.position.x - position.x);
        if (delta_x < SNAP_THRESHOLD) {
            adsorb_x = other_node.position.x;
            vertical = build_bounds('x', adsorb_x);
            break;
        }
    }

    return { x: adsorb_x, y: adsorb_y, guide: { horizontal, vertical } };
}

/**
 * 判断两个参考线 payload 是否等价（空对象或四边坐标一致），用于避免每帧无意义 setState。
 */
function guide_equal(a: guide_line_payload, b: guide_line_payload): boolean {
    if (a === b) {
        return true;
    }
    const a_is_empty = Object.keys(a).length === 0;
    const b_is_empty = Object.keys(b).length === 0;
    if (a_is_empty || b_is_empty) {
        return a_is_empty && b_is_empty;
    }
    const ba = a as guide_line_bounds;
    const bb = b as guide_line_bounds;
    return ba.x1 === bb.x1 && ba.x2 === bb.x2 && ba.y1 === bb.y1 && ba.y2 === bb.y2;
}

/**
 * 钩子：封装 compute_snap_change + guide_line setState。
 *
 * 关键点：
 * - 位置吸附对**所有** position 变更生效（含 React Flow 松手时发出的 `dragging: false` 终态变更），
 *   否则松手会以未吸附的原始指针位置落点，导致节点相对拖拽中的对齐位置发生偏移。
 * - 参考线只在活动拖拽（`dragging: true`）期间更新，且仅在其值实际变化时 setState，
 *   避免每帧构造新的空对象/坐标对象触发多余重渲染（拖拽卡顿的诱因之一）。
 */
export function useSnapGuide(
    nodes: Node[],
    set_horizontal_guide_lines: (value: guide_line_payload) => void,
    set_vertical_guide_lines: (value: guide_line_payload) => void,
) {
    const nodes_ref = useRef(nodes);
    nodes_ref.current = nodes;

    const horizontal_guide_ref = useRef<guide_line_payload>({});
    const vertical_guide_ref = useRef<guide_line_payload>({});

    const update_horizontal_guide = useCallback((value: guide_line_payload) => {
        if (guide_equal(horizontal_guide_ref.current, value)) {
            return;
        }
        horizontal_guide_ref.current = value;
        set_horizontal_guide_lines(value);
    }, [set_horizontal_guide_lines]);

    const update_vertical_guide = useCallback((value: guide_line_payload) => {
        if (guide_equal(vertical_guide_ref.current, value)) {
            return;
        }
        vertical_guide_ref.current = value;
        set_vertical_guide_lines(value);
    }, [set_vertical_guide_lines]);

    const apply_snap_to_change = useCallback(<T extends { id: string; type: string; position?: { x: number; y: number }; dragging?: boolean }>(
        change: T,
    ): T => {
        if (!(change.type === 'position' && change.position)) {
            return change;
        }

        const result = compute_snap_change(change.id, nodes_ref.current, { x: change.position.x, y: change.position.y });

        if (change.dragging) {
            update_horizontal_guide(result.guide.horizontal ?? {});
            update_vertical_guide(result.guide.vertical ?? {});
        }

        return {
            ...change,
            position: { x: result.x, y: result.y },
        };
    }, [update_horizontal_guide, update_vertical_guide]);

    const reset_guide_lines = useCallback(() => {
        update_horizontal_guide({});
        update_vertical_guide({});
    }, [update_horizontal_guide, update_vertical_guide]);

    return { apply_snap_to_change, reset_guide_lines };
}
