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
        traceEmitter.emit(TraceEvent.builder()
                .runId(runId)
                .type(TraceEventType.NODE_STARTED)
                .nodeId(definition.getId())
                .occurredAt(startedAt)
                .build());
        try {
            Map<String, Object> result = executeSync(state);
            traceEmitter.emit(TraceEvent.builder()
                    .runId(runId)
                    .type(TraceEventType.NODE_SUCCEEDED)
                    .nodeId(definition.getId())
                    .duration(System.currentTimeMillis() - startedAt)
                    .output(result)
                    .occurredAt(System.currentTimeMillis())
                    .build());
            return CompletableFuture.completedFuture(writeOutputs(result));
        } catch (Exception e) {
            traceEmitter.emit(TraceEvent.builder()
                    .runId(runId)
                    .type(TraceEventType.NODE_FAILED)
                    .nodeId(definition.getId())
                    .message(e.getMessage())
                    .errorCategory(WorkflowException.resolveCategory(e).name())
                    .errorCode(WorkflowException.resolveErrorCode(e))
                    .retryable(WorkflowException.resolveRetryable(e))
                    .detail(WorkflowException.resolveDetail(e))
                    .occurredAt(System.currentTimeMillis())
                    .build());
            return CompletableFuture.failedFuture(e);
        }
    }

    private Map<String, Object> executeSync(OverAllState state) {
        Map<String, Object> resolvedInputs = resolveInputs(state);
        Map<String, Object> result = executor.execute(
                new NodeExecuteRequest(definition.getId(), definition.getType(), definition.getConfig(), resolvedInputs));
        return result;
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
}
