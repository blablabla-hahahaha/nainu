package nainu.top.agi.master.executor.start;

import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.master.executor.NodeExecuteRequest;
import nainu.top.agi.master.executor.NodeExecutor;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 开始节点执行器：无输入无输出，仅作为图入口标记。
 */
@Component
public class StartExecutor implements NodeExecutor {

    @Override
    public NodeDefinition.NodeType getType() {
        return NodeDefinition.NodeType.START;
    }

    @Override
    public Map<String, Object> execute(NodeExecuteRequest request) {
        return Map.of();
    }
}
