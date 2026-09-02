package nainu.top.agi.sandbox;

import java.util.concurrent.CompletableFuture;

/**
 * 沙箱客户端门面（workflow/master 侧）：经 HTTP 调用沙箱服务执行一段代码。
 *
 * <p>实现须非阻塞（异步返回 {@link CompletableFuture}，不阻塞事件循环线程），
 * 失败经响应携带的 {@link nainu.top.agi.common.exception.ErrorCategory} 归类，不抛未分类异常。
 */
public interface WorkflowSandboxClient {

    /** 异步执行；成功完成带有 {@link SandboxExecuteResponse}（含分类的错误），失败仅限传输/不可达。 */
    CompletableFuture<SandboxExecuteResponse> execute(SandboxExecuteRequest request);

    /** 同步便捷方法：{@link #execute} 的阻塞封装（仅测试/非事件循环路径用）。 */
    default SandboxExecuteResponse executeSync(SandboxExecuteRequest request) {
        return execute(request).join();
    }
}
