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

    /**
     * 错误类别（{@link nainu.top.agi.common.exception.ErrorCategory#name()}）。可选；仅失败事件携带。
     */
    private String errorCategory;

    /**
     * 稳定错误码（如 {@code JSON_TEMPLATE_INVALID}）。可选；仅失败事件携带。
     */
    private String errorCode;

    /**
     * 是否可重试。可选；仅失败事件携带。
     */
    private Boolean retryable;

    /**
     * 技术侧错误详情（底层 cause 链的简单类名: 消息）。可选；仅失败事件且存在底层原因时携带，
     * 供用户可读文案之外的深挖与 AI 上下文使用。
     */
    private String detail;

    private Long duration;

    private Map<String, Object> output;

    private long occurredAt;

    /**
     * XADD ID（ms 时间-序号，单调递增）；由发射器写入。
     */
    private String seq;
}
