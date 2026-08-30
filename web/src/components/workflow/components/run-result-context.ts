import { createContext, useContext } from 'react';

/**
 * 运行结果置顶上下文的值。
 */
export interface run_result_context_value {
    /**
     * 当前被置顶的运行结果所属节点 id（其运行结果渲染在其它节点之上）。
     * 为 null 时无节点被置顶，所有运行结果按默认次序层叠。
     */
    top_node_id: string | null;
    /**
     * 将某节点的运行结果置顶到其它节点之上。
     */
    activate_node: (node_id: string) => void;
}

/**
 * 运行结果置顶上下文：把「被点击节点运行结果置顶」在画布与节点结果卡片间传递，
 * 避免经 canonical data 注入 UI 状态（data 是 round-trip 的唯一事实源）。
 */
export const run_result_context = createContext<run_result_context_value>({
    top_node_id: null,
    activate_node: () => undefined,
});

/**
 * 读取运行结果置顶上下文。
 */
export function useRunResultContext(): run_result_context_value {
    return useContext(run_result_context);
}
