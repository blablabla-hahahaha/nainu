package nainu.top.agi.master.trace;

import nainu.top.agi.common.trace.TraceEvent;
import nainu.top.agi.common.trace.TraceEventType;
import nainu.top.agi.common.util.JsonUtils;
import org.redisson.api.RStream;
import org.redisson.api.RedissonClient;
import org.redisson.api.StreamMessageId;
import org.redisson.api.stream.StreamAddArgs;
import org.redisson.api.stream.StreamReadArgs;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * trace 事件发射器：九事件写入 Redis Stream {@code trace:{runId}}（XADD ID 即 seq），
 * 同时推送到进程内 sink（SSE 实时推送用；单实例阶段一，跨实例实时性由 Redis 承担）。
 *
 * <p>事件不因发射失败而吞掉执行错误：XADD 失败向上抛出（大声失败）。
 */
@Component
public class TraceEmitter {

    private final RedissonClient redisson;

    private final Map<String, Sinks.Many<Map<String, Object>>> sinks = new ConcurrentHashMap<>();

    public TraceEmitter(RedissonClient redisson) {
        this.redisson = redisson;
    }

    /**
     * 发射事件：持久化 + 实时推送；返回 seq（XADD ID）。
     */
    public String emit(TraceEvent event) {
        RStream<String, Object> stream = redisson.getStream(streamKey(event.getRunId()));
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("runId", event.getRunId());
        fields.put("type", event.getType().name());
        fields.put("nodeId", event.getNodeId() == null ? "" : event.getNodeId());
        fields.put("message", event.getMessage() == null ? "" : event.getMessage());
        fields.put("duration", event.getDuration() == null ? 0 : event.getDuration());
        fields.put("output", event.getOutput() == null ? "{}" : JsonUtils.toJson(event.getOutput()));
        fields.put("occurredAt", event.getOccurredAt());
        StreamMessageId id = stream.add(StreamAddArgs.entries(fields));
        String seq = id.toString();
        event.setSeq(seq);

        Sinks.Many<Map<String, Object>> sink = sinks.get(event.getRunId());
        if (sink != null) {
            sink.tryEmitNext(toMessage(event));
        }
        return seq;
    }

    /**
     * 注册某 run 的实时推送通道；重复注册返回既有 sink。
     */
    public Sinks.Many<Map<String, Object>> register(String runId) {
        return sinks.computeIfAbsent(runId, k -> Sinks.many().multicast().onBackpressureBuffer());
    }

    /**
     * 注销实时通道（run 终态时调用）。
     */
    public void unregister(String runId) {
        Sinks.Many<Map<String, Object>> sink = sinks.remove(runId);
        if (sink != null) {
            sink.tryEmitComplete();
        }
    }

    /**
     * 历史事件（replay）：XRANGE 读取 seq 之后的事件（含 seq 过滤）。
     */
    public Flux<Map<String, Object>> history(String runId, String afterSeq, int limit) {
        return Flux.defer(() -> {
            RStream<String, Object> stream = redisson.getStream(streamKey(runId));
            StreamReadArgs args = StreamReadArgs.greaterThan(seqId(afterSeq)).count(limit);
            Map<StreamMessageId, Map<String, Object>> entries = stream.read(args);
            return Flux.fromIterable(entries.entrySet())
                    .map(e -> toMessage(fromFields(e.getKey().toString(), e.getValue())));
        });
    }

    private static Map<String, Object> toMessage(TraceEvent event) {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("seq", event.getSeq());
        message.put("type", event.getType().name());
        message.put("nodeId", event.getNodeId());
        message.put("message", event.getMessage());
        message.put("duration", event.getDuration());
        message.put("output", event.getOutput());
        message.put("occurredAt", event.getOccurredAt());
        return message;
    }

    private static TraceEvent fromFields(String seq, Map<String, Object> fields) {
        return TraceEvent.builder()
                .seq(seq)
                .runId(str(fields.get("runId")))
                .type(safeType(str(fields.get("type"))))
                .nodeId(str(fields.get("nodeId")))
                .message(str(fields.get("message")))
                .duration(fields.get("duration") instanceof Number n ? n.longValue() : null)
                .output(parseOutput(str(fields.get("output"))))
                .occurredAt(fields.get("occurredAt") instanceof Number n ? n.longValue() : 0L)
                .build();
    }

    private static TraceEventType safeType(String name) {
        try {
            return TraceEventType.valueOf(name);
        } catch (IllegalArgumentException e) {
            return TraceEventType.EXECUTION_FAILED;
        }
    }

    private static Map<String, Object> parseOutput(String json) {
        if (json == null || json.isEmpty() || "{}".equals(json)) {
            return Map.of();
        }
        try {
            return JsonUtils.fromJson(json, new com.fasterxml.jackson.core.type.TypeReference<>() {
            });
        } catch (Exception e) {
            return Map.of();
        }
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static StreamMessageId seqId(String seq) {
        if (seq == null || seq.isEmpty()) {
            return new StreamMessageId(0, 0);
        }
        int dash = seq.indexOf('-');
        if (dash <= 0) {
            return new StreamMessageId(0, 0);
        }
        try {
            return new StreamMessageId(Long.parseLong(seq.substring(0, dash)),
                    Long.parseLong(seq.substring(dash + 1)));
        } catch (NumberFormatException e) {
            return new StreamMessageId(0, 0);
        }
    }

    private static String streamKey(String runId) {
        return "trace:" + runId;
    }
}
