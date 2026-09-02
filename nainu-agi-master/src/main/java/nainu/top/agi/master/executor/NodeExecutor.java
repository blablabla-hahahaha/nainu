package nainu.top.agi.master.executor;

import nainu.top.agi.common.dsl.NodeDefinition;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * 节点执行器契约：按类型注册（{@link NodeExecutorRegistry}），返回结果字段映射。
 *
 * <p>执行器保持无副作用（或幂等）：graph-core 取消/重试语义下节点可能重跑（at-least-once）。
 * IO 型节点（HTTP / LLM / SCRIPT）应经异步 action 变体 {@link #executeAsync} 接入（返回
 * {@link CompletableFuture}，不阻塞事件循环线程）；同步 {@link #execute} 默认委托给
 * {@link #executeAsync} 一步完成，供直接调用与测试。
 */
public interface NodeExecutor {

    NodeDefinition.NodeType getType();

    Map<String, Object> execute(NodeExecuteRequest request);

    /**
     * 异步执行：IO 型节点覆盖此方法以非阻塞返回；默认在调用线程同步执行 {@link #execute}。
     */
    default CompletableFuture<Map<String, Object>> executeAsync(NodeExecuteRequest request) {
        return CompletableFuture.completedFuture(execute(request));
    }
}
