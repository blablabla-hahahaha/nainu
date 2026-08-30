package nainu.top.agi.common.exception;

/**
 * 执行错误类别：按「用户改 DSL 能否修好」划分责任归属。
 *
 * <p>{@code AUTHORING}——用户配置/脚本/格式错误，修改 DSL 可修复；前端应可行动地透出（含字段定位）。
 * {@code PLATFORM}——平台自身失败（执行器 bug、资源上限、基础设施），用户无法修复；前端只给友好文案 + errorCode + runId，原始堆栈只进日志。
 * {@code EXTERNAL}——上游依赖失败（第三方 API 超时/限流/5xx），可能重试或改配置。
 *
 * <p>归类判据：用户改 DSL 能修好 → {@code AUTHORING}；不能 → {@code PLATFORM} 或 {@code EXTERNAL}。
 * 未知异常默认 {@code PLATFORM}：未被设计过的错误更可能是平台缺口。
 */
public enum ErrorCategory {
    AUTHORING,
    PLATFORM,
    EXTERNAL
}
