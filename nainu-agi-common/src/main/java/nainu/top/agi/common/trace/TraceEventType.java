package nainu.top.agi.common.trace;

/**
 * trace 事件类型（九事件）：execution_* 为执行级，node_* 为节点级。
 * 每事件携带 {runId, seq, ts, nodeId?, checkpoint_id?}；seq 即 Redis Stream 的 XADD ID（单调）。
 */
public enum TraceEventType {

    /**
     * 执行启动
     */
    EXECUTION_STARTED,
    /**
     * 执行正常结束
     */
    EXECUTION_COMPLETED,
    /**
     * 执行失败
     */
    EXECUTION_FAILED,
    /**
     * 用户暂停
     */
    EXECUTION_PAUSED,
    /**
     * 用户恢复（从最后检查点续跑）
     */
    EXECUTION_RESUMED,
    /**
     * 节点开始执行
     */
    NODE_STARTED,
    /**
     * 节点执行成功（含输出快照与耗时）
     */
    NODE_SUCCEEDED,
    /**
     * 节点执行失败
     */
    NODE_FAILED,
    /**
     * HITL 挂起等待人工输入
     */
    NODE_SUSPENDED;
}
