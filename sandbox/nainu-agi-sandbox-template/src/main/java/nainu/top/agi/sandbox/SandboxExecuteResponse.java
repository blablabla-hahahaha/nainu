package nainu.top.agi.sandbox;

import nainu.top.agi.common.exception.ErrorCategory;

import java.util.Map;

/**
 * 沙箱执行响应。
 *
 * <p>成功时 {@code errorCategory} 为 null；失败时按现存三件套契约归类
 * （用户脚本语法/运行时错误 → {@link ErrorCategory#AUTHORING}；资源上限/服务问题 → {@link ErrorCategory#PLATFORM}）。
 *
 * @param result        脚本返回值（按 output 映射写回的原始结果），失败时通常为空。
 * @param stdout        脚本标准输出（用户打印）。
 * @param stderr        脚本标准错误。
 * @param errorCategory 错误类别；成功为 null。
 * @param errorCode     稳定错误码；成功为 null。
 * @param detail        用户可读的错误详情（或技术侧关键信息）。
 * @param durationMs    执行耗时（毫秒）。
 */
public record SandboxExecuteResponse(
        Map<String, Object> result,
        String stdout,
        String stderr,
        ErrorCategory errorCategory,
        String errorCode,
        String detail,
        Long durationMs) {

    public boolean success() {
        return errorCategory == null;
    }

    public static SandboxExecuteResponse success(Map<String, Object> result, String stdout, String stderr, Long durationMs) {
        return new SandboxExecuteResponse(result, stdout, stderr, null, null, null, durationMs);
    }

    public static SandboxExecuteResponse failure(ErrorCategory category, String errorCode, String detail) {
        return new SandboxExecuteResponse(null, null, null, category, errorCode, detail, 0L);
    }
}
