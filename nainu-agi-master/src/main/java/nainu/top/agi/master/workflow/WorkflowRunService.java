package nainu.top.agi.master.workflow;

import com.alibaba.cloud.ai.graph.CompiledGraph;
import com.alibaba.cloud.ai.graph.NodeOutput;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.action.InterruptionMetadata;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nainu.top.agi.common.dsl.GraphDefinition;
import nainu.top.agi.common.trace.TraceEvent;
import nainu.top.agi.common.trace.TraceEventType;
import nainu.top.agi.master.compile.StateGraphCompiler;
import nainu.top.agi.master.trace.TraceEmitter;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;

import java.util.Map;
import java.util.UUID;

/**
 * 工作流运行服务：编译（缓存）→ 执行（graph-core）→ trace 事件（九事件）。
 *
 * <p>execute 返回 runId 后异步执行；事件实时经进程内 sink 推送（SSE），历史经 Redis Stream 重放。
 * 暂停 = 取消当前流（graph-core 取消语义，at-least-once：被中断节点 resume 后重跑）；
 * 恢复 = 同 threadId 再 invoke（RedisSaver 从最后检查点续跑）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowRunService {

    private static final int HISTORY_LIMIT = 10_000;

    private final StateGraphCompiler compiler;

    private final TraceEmitter traceEmitter;

    private final RunSessionRegistry sessionRegistry;

    /**
     * 启动执行：返回 runId，执行在后台推进。
     */
    public Mono<String> execute(GraphDefinition dsl, Map<String, Object> inputs, String runId) {
        return Mono.fromCallable(() -> compiler.compile(dsl))
                .subscribeOn(Schedulers.boundedElastic())
                .map(graph -> {
                    Sinks.Many<Map<String, Object>> sink = traceEmitter.register(runId);
                    RunSession session = new RunSession(runId, graph, sink);
                    RunSession existing = sessionRegistry.put(runId, session);
                    if (existing != null) {
                        throw new IllegalStateException("runId 已存在: " + runId);
                    }
                    traceEmitter.emit(TraceEvent.builder()
                            .runId(runId)
                            .type(TraceEventType.EXECUTION_STARTED)
                            .occurredAt(System.currentTimeMillis())
                            .build());
                    session.setDisposable(consume(graph, inputs, session));
                    return runId;
                });
    }

    /**
     * 底层执行流（demo runner / 内部使用）：同 threadId 即从检查点续跑。
     */
    public Flux<NodeOutput> stream(GraphDefinition dsl, Map<String, Object> inputs, String runId) {
        Map<String, Object> safeInputs = inputs == null ? Map.of() : inputs;
        return Mono.fromCallable(() -> compiler.compile(dsl))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMapMany(graph -> graph.stream(safeInputs, RunnableConfig.builder().threadId(runId).build()));
    }

    /**
     * SSE 事件流：先补发历史（Last-Event-ID 之后），再跟随实时 sink。
     */
    public Flux<ServerSentEvent<Map<String, Object>>> streamEvents(String runId, String lastEventId) {
        RunSession session = sessionRegistry.get(runId);
        Sinks.Many<Map<String, Object>> sink = session != null
                ? session.getSink()
                : Sinks.many().multicast().onBackpressureBuffer();
        Flux<Map<String, Object>> history = traceEmitter.history(runId, lastEventId, HISTORY_LIMIT)
                .subscribeOn(Schedulers.boundedElastic());
        Flux<Map<String, Object>> live = sink.asFlux()
                .filter(m -> lastEventId == null || String.valueOf(m.get("seq")).compareTo(lastEventId) > 0);
        return Flux.concat(history, live)
                .map(m -> ServerSentEvent.<Map<String, Object>>builder(m)
                        .id(String.valueOf(m.get("seq")))
                        .build());
    }

    /**
     * 历史事件（replay 模式）。
     */
    public Flux<Map<String, Object>> events(String runId) {
        return traceEmitter.history(runId, null, HISTORY_LIMIT)
                .subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * 用户暂停：取消当前流订阅（graph-core 取消语义）。
     */
    public Mono<Void> pause(String runId) {
        return Mono.<Void>create(sink -> {
            RunSession session = requireSession(runId);
            if (session.getDisposable() != null) {
                session.getDisposable().dispose();
            }
            session.setStatus("PAUSED");
            traceEmitter.emit(TraceEvent.builder()
                    .runId(runId)
                    .type(TraceEventType.EXECUTION_PAUSED)
                    .occurredAt(System.currentTimeMillis())
                    .build());
            sink.success();
        }).subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * 恢复：有 HITL 中断时先注入输入（updateState），再同 threadId 续跑。
     */
    public Mono<Void> resume(String runId, Map<String, Object> interruptInput) {
        return Mono.<Void>create(sink -> {
            RunSession session = requireSession(runId);
            if (session.getInterruptedNode() != null && interruptInput != null) {
                try {
                    session.getGraph().updateState(
                            RunnableConfig.builder().threadId(runId).build(),
                            interruptInput,
                            session.getInterruptedNode());
                } catch (Exception e) {
                    throw new IllegalStateException("恢复 HITL 中断失败: " + e.getMessage(), e);
                }
                session.setInterruptedNode(null);
            }
            session.setStatus("RUNNING");
            traceEmitter.emit(TraceEvent.builder()
                    .runId(runId)
                    .type(TraceEventType.EXECUTION_RESUMED)
                    .occurredAt(System.currentTimeMillis())
                    .build());
            session.setDisposable(consume(session.getGraph(), Map.of(), session));
            sink.success();
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private reactor.core.Disposable consume(CompiledGraph graph, Map<String, Object> inputs, RunSession session) {
        Map<String, Object> safeInputs = inputs == null ? Map.of() : inputs;
        return graph.stream(safeInputs, RunnableConfig.builder().threadId(session.getRunId()).build())
                .subscribe(
                        output -> onNodeOutput(output, session),
                        error -> {
                            log.error("执行失败 runId={}", session.getRunId(), error);
                            traceEmitter.emit(TraceEvent.builder()
                                    .runId(session.getRunId())
                                    .type(TraceEventType.EXECUTION_FAILED)
                                    .message(error.getMessage())
                                    .occurredAt(System.currentTimeMillis())
                                    .build());
                            finish(session, "FAILED");
                        },
                        () -> {
                            traceEmitter.emit(TraceEvent.builder()
                                    .runId(session.getRunId())
                                    .type(TraceEventType.EXECUTION_COMPLETED)
                                    .occurredAt(System.currentTimeMillis())
                                    .build());
                            finish(session, "COMPLETED");
                        });
    }

    private void onNodeOutput(NodeOutput output, RunSession session) {
        if (output instanceof InterruptionMetadata interruption) {
            session.setStatus("SUSPENDED");
            session.setInterruptedNode(interruption.node());
            traceEmitter.emit(TraceEvent.builder()
                    .runId(session.getRunId())
                    .type(TraceEventType.NODE_SUSPENDED)
                    .nodeId(interruption.node())
                    .message("等待人工输入")
                    .occurredAt(System.currentTimeMillis())
                    .build());
        }
    }

    private void finish(RunSession session, String status) {
        session.setStatus(status);
        traceEmitter.unregister(session.getRunId());
        sessionRegistry.remove(session.getRunId());
    }

    private RunSession requireSession(String runId) {
        RunSession session = sessionRegistry.get(runId);
        if (session == null) {
            throw new IllegalArgumentException("run 不存在或已结束: " + runId);
        }
        return session;
    }

    /**
     * 生成新 runId。
     */
    public static String newRunId() {
        return UUID.randomUUID().toString();
    }
}
