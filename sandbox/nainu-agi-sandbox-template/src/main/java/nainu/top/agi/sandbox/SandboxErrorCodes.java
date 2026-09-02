package nainu.top.agi.sandbox;

import nainu.top.agi.common.exception.ErrorCategory;

/**
 * 沙箱错误码（稳定标识，配合 {@link ErrorCategory} 使用）。
 *
 * <p>归属沿用现存三件套契约：用户脚本/语法/静态校验问题 → {@link ErrorCategory#AUTHORING}；
 * 不支持语言 / 超时 / 内部错误 → {@link ErrorCategory#PLATFORM}。
 */
public final class SandboxErrorCodes {

    public static final String SANDBOX_EMPTY = "SANDBOX_EMPTY";
    public static final String SANDBOX_UNSUPPORTED_LANGUAGE = "SANDBOX_UNSUPPORTED_LANGUAGE";
    public static final String SANDBOX_STATIC_CHECK_FAILED = "SANDBOX_STATIC_CHECK_FAILED";
    public static final String SANDBOX_EXECUTION_FAILED = "SANDBOX_EXECUTION_FAILED";
    public static final String SANDBOX_TIMEOUT = "SANDBOX_TIMEOUT";
    public static final String SANDBOX_INTERNAL = "SANDBOX_INTERNAL";

    private SandboxErrorCodes() {
    }
}
