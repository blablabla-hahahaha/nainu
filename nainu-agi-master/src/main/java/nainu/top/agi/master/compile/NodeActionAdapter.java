package nainu.top.agi.master.compile;

import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.action.AsyncNodeActionWithConfig;
import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.common.dsl.NodeInputFieldDefinition;
import nainu.top.agi.common.dsl.NodeOutputFieldDefinition;
import nainu.top.agi.common.exception.WorkflowException;
import nainu.top.agi.common.trace.TraceEvent;
import nainu.top.agi.common.trace.TraceEventType;
import nainu.top.agi.master.executor.NodeExecuteRequest;
import nainu.top.agi.master.executor.NodeExecutor;
import nainu.top.agi.master.trace.TraceEmitter;
import nainu.top.agi.master.workflow.StateKeys;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;

/**
 * 节点适配壳：把 DSL 节点包装为 graph-core 的 {@link AsyncNodeActionWithConfig}。
 *
 * <p>统一管线：trace node_started → 输入解析（INTERNAL_REF 读状态）→ 执行（delegate 到注册的执行器）→
 * trace node_succeeded/node_failed → 输出写回状态（{@code node:{nodeId}.{keyAlias}}，KeyStrategy Replace）。
 * runId 取自 {@link RunnableConfig#threadId()}（= 执行 threadId）。
 */
public class NodeActionAdapter implements AsyncNodeActionWithConfig {

    private final NodeDefinition definition;

    private final NodeExecutor executor;

    private final TraceEmitter traceEmitter;

    public NodeActionAdapter(NodeDefinition definition, NodeExecutor executor, TraceEmitter traceEmitter) {
        this.definition = definition;
        this.executor = executor;
        this.traceEmitter = traceEmitter;
    }

    @Override
    public CompletableFuture<Map<String, Object>> apply(OverAllState state, RunnableConfig config) {
        String runId = config.threadId().orElse(null);
        long startedAt = System.currentTimeMillis();
        Map<String, Object> resolvedInputs = resolveInputs(state);
        traceEmitter.emit(TraceEvent.builder()
                .runId(runId)
                .type(TraceEventType.NODE_STARTED)
                .nodeId(definition.getId())
                .input(resolvedInputs)
                .occurredAt(startedAt)
                .build());
        CompletableFuture<Map<String, Object>> resultFuture;
        try {
            resultFuture = executor.executeAsync(
                    new NodeExecuteRequest(definition.getId(), definition.getType(), definition.getConfig(), resolvedInputs));
        } catch (Exception e) {
            resultFuture = CompletableFuture.failedFuture(e);
        }
        return resultFuture
                .thenApply(result -> {
                    traceEmitter.emit(TraceEvent.builder()
                            .runId(runId)
                            .type(TraceEventType.NODE_SUCCEEDED)
                            .nodeId(definition.getId())
                            .duration(System.currentTimeMillis() - startedAt)
                            .output(visibleOutput(result))
                            .occurredAt(System.currentTimeMillis())
                            .build());
                    return writeOutputs(result);
                })
                .whenComplete((result, throwable) -> {
                    if (throwable != null) {
                        Throwable cause = unwrap(throwable);
                        traceEmitter.emit(TraceEvent.builder()
                                .runId(runId)
                                .type(TraceEventType.NODE_FAILED)
                                .nodeId(definition.getId())
                                .message(cause.getMessage())
                                .errorCategory(WorkflowException.resolveCategory(cause).name())
                                .errorCode(WorkflowException.resolveErrorCode(cause))
                                .retryable(WorkflowException.resolveRetryable(cause))
                                .detail(WorkflowException.resolveDetail(cause))
                                .occurredAt(System.currentTimeMillis())
                                .build());
                    }
                });
    }

    private static Throwable unwrap(Throwable t) {
        Throwable cur = t;
        while ((cur instanceof CompletionException || cur instanceof ExecutionException) && cur.getCause() != null) {
            cur = cur.getCause();
        }
        return cur;
    }

    private Map<String, Object> resolveInputs(OverAllState state) {
        Map<String, Object> resolved = new HashMap<>();
        for (NodeInputFieldDefinition f : definition.getInput() == null ? java.util.List.<NodeInputFieldDefinition>of() : definition.getInput()) {
            switch (f.getType()) {
                case CUSTOM -> resolved.put(f.getKey(), f.getValue());
                case INTERNAL_REF -> resolved.put(f.getKey(), state.value(StateKeys.ofRef(f.getValue())).orElse(null));
                case EXTERNAL_REF -> resolved.put(f.getKey(), null);
            }
        }
        return resolved;
    }

    private Map<String, Object> writeOutputs(Map<String, Object> result) {
        Map<String, Object> stateUpdates = new HashMap<>();
        if (result == null) {
            return stateUpdates;
        }
        for (NodeOutputFieldDefinition o : definition.getOutput() == null ? java.util.List.<NodeOutputFieldDefinition>of() : definition.getOutput()) {
            String alias = o.getKeyAlias() != null && !o.getKeyAlias().isEmpty() ? o.getKeyAlias() : o.getKey();
            stateUpdates.put(StateKeys.of(definition.getId(), alias), result.get(o.getKey()));
        }
        return stateUpdates;
    }

    /**
     * 计算节点对外可见输出（trace 快照）：按 {@code node.output} 声明把执行器原始结果映射为别名键。
     *
     * 仅收录声明在 {@code node.output} 的字段（keyAlias 为空时落回 key），键与 {@link #writeOutputs}
     * 写回图状态的键一致；原始结果里未声明的 key 属于执行细节，不算节点输出（不可被下游引用）。
     * 纯映射函数，不依赖注入的 executor / traceEmitter（包内可见，供测试直接断言）。
     */
    Map<String, Object> visibleOutput(Map<String, Object> result) {
        Map<String, Object> visible = new HashMap<>();
        if (result == null) {
            return visible;
        }
        for (NodeOutputFieldDefinition o : definition.getOutput() == null ? java.util.List.<NodeOutputFieldDefinition>of() : definition.getOutput()) {
            if (o.getKey() == null || !result.containsKey(o.getKey())) {
                continue;
            }
            String alias = o.getKeyAlias() != null && !o.getKeyAlias().isEmpty() ? o.getKeyAlias() : o.getKey();
            visible.put(alias, result.get(o.getKey()));
        }
        return visible;
    }
}
