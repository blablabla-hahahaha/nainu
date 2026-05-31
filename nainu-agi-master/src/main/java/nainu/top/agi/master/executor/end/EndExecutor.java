package nainu.top.agi.master.executor.end;

import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.master.executor.NodeExecuteRequest;
import nainu.top.agi.master.executor.NodeExecutor;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 结束节点执行器：终止标记，无输入无输出。
 */
@Component
public class EndExecutor implements NodeExecutor {

    @Override
    public NodeDefinition.NodeType getType() {
        return NodeDefinition.NodeType.END;
    }

    @Override
    public Map<String, Object> execute(NodeExecuteRequest request) {
        return Map.of();
    }
}
