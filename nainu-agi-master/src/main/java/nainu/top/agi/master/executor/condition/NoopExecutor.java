package nainu.top.agi.master.executor.condition;

import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.master.executor.NodeExecuteRequest;
import nainu.top.agi.master.executor.NodeExecutor;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 条件节点执行器：纯路由点，无执行体（出边条件由编译器生成的 router 求值）。
 * 注册为执行器仅为让 NodeActionAdapter 统一发射 trace 事件（回放可见路由点状态）。
 */
@Component
public class NoopExecutor implements NodeExecutor {

    @Override
    public NodeDefinition.NodeType getType() {
        return NodeDefinition.NodeType.CONDITION;
    }

    @Override
    public Map<String, Object> execute(NodeExecuteRequest request) {
        return Map.of();
    }
}
