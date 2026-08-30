package nainu.top.agi.master.compile;

import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.checkpoint.config.SaverConfig;
import com.alibaba.cloud.ai.graph.checkpoint.savers.redis.RedisSaver;
import com.alibaba.cloud.ai.graph.exception.GraphStateException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.RequiredArgsConstructor;
import nainu.top.agi.common.dsl.EdgeDefinition;
import nainu.top.agi.common.dsl.GraphDefinition;
import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.common.exception.ErrorCategory;
import nainu.top.agi.common.exception.ErrorCodes;
import nainu.top.agi.common.exception.WorkflowException;
import nainu.top.agi.master.executor.NodeExecutor;
import nainu.top.agi.master.executor.NodeExecutorRegistry;
import nainu.top.agi.master.executor.condition.ConditionEvaluator;
import nainu.top.agi.master.trace.TraceEmitter;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.alibaba.cloud.ai.graph.action.AsyncEdgeAction.edge_async;

/**
 * DSL → CompiledGraph 编译器：canonical DSL 是资产，graph-core 是执行后端。
 *
 * <p>节点映射：START/END → graph-core 虚拟节点；其余 → {@link NodeActionAdapter} 包装注册的执行器。
 * 静态边 → {@code addEdge}；条件边（typed conditional edge）→ 每源节点一个集中式 router
 * （按 DSL 边数组序求值，key = 分支边 id，mappings = edgeId → target）。
 * 按 (workflowId, version) 缓存编译结果（Caffeine）。
 */
@Component
@RequiredArgsConstructor
public class StateGraphCompiler {

    private final NodeExecutorRegistry executorRegistry;

    private final ConditionEvaluator conditionEvaluator;

    private final TraceEmitter traceEmitter;

    private final RedissonClient redisson;

    private final Cache<CompileKey, CompiledGraph> cache = Caffeine.newBuilder().maximumSize(200).build();

    /**
     * 编译并缓存；DSL 变更需递增 version 使缓存失效。
     */
    public CompiledGraph compile(GraphDefinition dsl) {
        CompileKey key = new CompileKey(dsl.getId(), dsl.getVersion());
        CompiledGraph cached = cache.getIfPresent(key);
        if (cached != null) {
            return cached;
        }
        DslValidator.validate(dsl);
        CompiledGraph compiled = build(dsl);
        cache.put(key, compiled);
        return compiled;
    }

    private CompiledGraph build(GraphDefinition dsl) {
        try {
            return doBuild(dsl);
        } catch (GraphStateException e) {
            throw new IllegalStateException("工作流编译失败（workflowId=" + dsl.getId() + "）: " + e.getMessage(), e);
        }
    }

    private CompiledGraph doBuild(GraphDefinition dsl) throws GraphStateException {
        Map<String, NodeDefinition.NodeType> typeById = new HashMap<>();
        for (NodeDefinition node : dsl.getNodes()) {
            typeById.put(node.getId(), node.getType());
        }

        StateGraph graph = new StateGraph("workflow-" + dsl.getId(), Collections::emptyMap);

        for (NodeDefinition node : dsl.getNodes()) {
            NodeDefinition.NodeType type = node.getType();
            if (type == NodeDefinition.NodeType.START || type == NodeDefinition.NodeType.END) {
                continue;
            }
            NodeExecutor executor = executorRegistry.get(type);
            if (executor == null) {
                throw new IllegalStateException("未找到节点类型 " + type + " 的执行器（节点 " + node.getId() + "）");
            }
            graph.addNode(node.getId(), new NodeActionAdapter(node, executor, traceEmitter));
        }

        for (EdgeDefinition edge : dsl.getEdges()) {
            if (edge.getCondition() != null) {
                continue;
            }
            graph.addEdge(mapStart(edge.getSource(), typeById), mapEnd(edge.getTarget(), typeById));
        }

        List<EdgeDefinition> condEdges = dsl.getEdges().stream()
                .filter(e -> e.getCondition() != null)
                .toList();
        Map<String, List<EdgeDefinition>> bySource = condEdges.stream()
                .collect(Collectors.groupingBy(EdgeDefinition::getSource, LinkedHashMap::new, Collectors.toList()));
        for (Map.Entry<String, List<EdgeDefinition>> entry : bySource.entrySet()) {
            String source = entry.getKey();
            List<EdgeDefinition> edges = entry.getValue();
            Map<String, String> mappings = new LinkedHashMap<>();
            for (EdgeDefinition edge : edges) {
                mappings.put(edge.getId(), mapEnd(edge.getTarget(), typeById));
            }
            graph.addConditionalEdges(source, edge_async(state -> {
                for (EdgeDefinition edge : edges) {
                    if (conditionEvaluator.evaluate(edge.getCondition(), key -> state.value(key).orElse(null))) {
                        return edge.getId();
                    }
                }
                throw new WorkflowException(ErrorCategory.AUTHORING, ErrorCodes.CONDITION_NO_MATCH,
                        "条件分支无命中且无 ELSE（节点 " + source + "）");
            }), mappings);
        }

        RedisSaver saver = RedisSaver.builder().redisson(redisson).build();
        CompileConfig config = CompileConfig.builder()
                .saverConfig(SaverConfig.builder().register(saver).build())
                .build();
        return graph.compile(config);
    }

    private static String mapStart(String nodeId, Map<String, NodeDefinition.NodeType> typeById) {
        return typeById.get(nodeId) == NodeDefinition.NodeType.START ? StateGraph.START : nodeId;
    }

    private static String mapEnd(String nodeId, Map<String, NodeDefinition.NodeType> typeById) {
        return typeById.get(nodeId) == NodeDefinition.NodeType.END ? StateGraph.END : nodeId;
    }

    public record CompileKey(String workflowId, Integer version) {
    }
}
