package nainu.top.agi.master.executor.debug;

import lombok.extern.slf4j.Slf4j;
import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.master.executor.NodeExecuteRequest;
import nainu.top.agi.master.executor.NodeExecutor;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * 调试节点执行器：返回固定演示数据（确定性，可测）。
 */
@Slf4j
@Component
public class DebugExecutor implements NodeExecutor {

    @Override
    public NodeDefinition.NodeType getType() {
        return NodeDefinition.NodeType.DEBUG;
    }

    @Override
    public Map<String, Object> execute(NodeExecuteRequest request) {
        Map<String, Object> result = new HashMap<>();
        result.put("result_username", "张三0");
        result.put("result_age", 10);
        return result;
    }
}
