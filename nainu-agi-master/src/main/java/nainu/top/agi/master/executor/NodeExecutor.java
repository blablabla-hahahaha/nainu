package nainu.top.agi.master.executor;

import nainu.top.agi.common.dsl.NodeDefinition;

import java.util.Map;

/**
 * 节点执行器契约：按类型注册（{@link NodeExecutorRegistry}），返回结果字段映射。
 *
 * <p>执行器保持同步、无副作用（或幂等）：graph-core 取消/重试语义下节点可能重跑（at-least-once）。
 * IO 型节点（HTTP / LLM / SCRIPT）在实现时经异步 action 变体接入，本契约不变。
 */
public interface NodeExecutor {

    NodeDefinition.NodeType getType();

    Map<String, Object> execute(NodeExecuteRequest request);
}
