package nainu.top.agi.master.executor;

import nainu.top.agi.common.dsl.NodeDefinition;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 节点执行器注册中心：Spring 自动收集全部 {@link NodeExecutor}，按类型查找。
 *
 * <p>注册即副作用：新增节点类型 = 新增 executor 实现类，无需改核心循环。
 */
@Component
public class NodeExecutorRegistry {

    private final Map<NodeDefinition.NodeType, NodeExecutor> registry = new HashMap<>();

    @Autowired
    public NodeExecutorRegistry(List<NodeExecutor> executors) {
        for (NodeExecutor executor : executors) {
            registry.put(executor.getType(), executor);
        }
    }

    /**
     * 按节点类型获取执行器；未注册时返回 null（编译期大声失败由编译器负责）。
     */
    public NodeExecutor get(NodeDefinition.NodeType type) {
        return registry.get(type);
    }
}
