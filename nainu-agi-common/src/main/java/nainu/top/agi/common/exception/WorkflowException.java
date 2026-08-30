package nainu.top.agi.common.exception;

/**
 * 工作流执行异常：携带错误类别（{@link ErrorCategory}）、稳定错误码（{@code errorCode}）与可重试标记。
 *
 * <p>执行器在抛出时声明归属；管线（NodeActionAdapter / WorkflowRunService）把三件套盖到
 * {@code NODE_FAILED} / {@code EXECUTION_FAILED} 的 trace 事件上。非本类型的异常无法读取三件套，
 * 由管线默认按 {@link ErrorCategory#PLATFORM} 呈现（未知异常不甩锅给用户）。
 */
public class WorkflowException extends NainuException {

    private final ErrorCategory category;

    private final String errorCode;

    private final boolean retryable;

    public WorkflowException(ErrorCategory category, String errorCode, String message) {
        this(category, errorCode, message, false, null);
    }

    public WorkflowException(ErrorCategory category, String errorCode, String message, boolean retryable) {
        this(category, errorCode, message, retryable, null);
    }

    public WorkflowException(ErrorCategory category, String errorCode, String message, boolean retryable,
                             Throwable cause) {
        super(message, cause);
        this.category = category;
        this.errorCode = errorCode;
        this.retryable = retryable;
    }

    public ErrorCategory getCategory() {
        return category;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public boolean isRetryable() {
        return retryable;
    }

    /**
     * 从任意 {@link Throwable} 解析错误类别（沿 cause 链查找 {@link WorkflowException}）。
     * 非本类型异常不携带归属，默认返回 {@link ErrorCategory#PLATFORM}（未知异常不甩锅给用户）。
     */
    public static ErrorCategory resolveCategory(Throwable e) {
        WorkflowException we = findWorkflow(e);
        return we == null ? ErrorCategory.PLATFORM : we.getCategory();
    }

    /**
     * 从任意 {@link Throwable} 解析稳定错误码；无 {@link WorkflowException} 时返回 {@code null}。
     */
    public static String resolveErrorCode(Throwable e) {
        WorkflowException we = findWorkflow(e);
        return we == null ? null : we.getErrorCode();
    }

    /**
     * 从任意 {@link Throwable} 解析可重试标记；默认不可重试。
     */
    public static boolean resolveRetryable(Throwable e) {
        WorkflowException we = findWorkflow(e);
        return we != null && we.isRetryable();
    }

    /**
     * 从任意 {@link Throwable} 解析技术侧错误详情（用户可读文案之外的补充信息）。
     *
     * <p>只取最内层 cause 的非空 message 作为关键信息，并去掉 JSON 解析器附加的
     * {@code at [Source...]} 位置噪音、避免类名与内部堆栈泄漏；按长度收敛防止透出过多。
     * 无底层原因时返回 {@code null}。
     */
    public static String resolveDetail(Throwable e) {
        WorkflowException we = findWorkflow(e);
        Throwable start = we != null ? we.getCause() : e;
        String msg = deepestMessage(start);
        if (msg == null || msg.isBlank()) {
            return null;
        }
        msg = trimSourceLocation(msg);
        msg = truncate(msg, 200);
        return msg.isBlank() ? null : msg;
    }

    private static String deepestMessage(Throwable start) {
        if (start == null) {
            return null;
        }
        Throwable cur = start;
        Throwable lastWithMsg = null;
        while (cur != null) {
            if (cur.getMessage() != null && !cur.getMessage().isBlank()) {
                lastWithMsg = cur;
            }
            cur = cur.getCause();
        }
        return lastWithMsg == null ? start.getMessage() : lastWithMsg.getMessage();
    }

    private static String trimSourceLocation(String s) {
        String lower = s.toLowerCase();
        int idx = lower.indexOf(" at [");
        if (idx >= 0) {
            return s.substring(0, idx).trim();
        }
        return s.trim();
    }

    private static String truncate(String s, int max) {
        if (s.length() <= max) {
            return s;
        }
        return s.substring(0, max).trim() + "…";
    }

    private static WorkflowException findWorkflow(Throwable e) {
        Throwable cur = e;
        while (cur != null) {
            if (cur instanceof WorkflowException we) {
                return we;
            }
            cur = cur.getCause();
        }
        return null;
    }
}
