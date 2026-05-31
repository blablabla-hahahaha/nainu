package nainu.top.agi.common.trace;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * trace 事件（九事件的载体）：持久化于 Redis Stream {@code trace:{runId}}，XADD ID 即 seq。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TraceEvent {

    private String runId;

    private TraceEventType type;

    private String nodeId;

    private String message;

    private Long duration;

    private Map<String, Object> output;

    private long occurredAt;

    /**
     * XADD ID（ms 时间-序号，单调递增）；由发射器写入。
     */
    private String seq;
}
