package nainu.top.agi.sandbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import nainu.top.agi.common.exception.ErrorCategory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;

/**
 * {@link WorkflowSandboxClient} 的 JDK {@link HttpClient} 实现（无外置 HTTP 依赖，契约模块保持轻）。
 *
 * <p>非阻塞：{@code sendAsync} 在其自身线程池执行 IO，不阻塞事件循环线程。
 * 服务端 2xx 一律反序列化为 {@link SandboxExecuteResponse}（含分类错误）；非 2xx 与传输不可达
 * 一律收敛为 {@link ErrorCategory#PLATFORM} 响应（SANDBOX_INTERNAL），使上游 NODE_FAILED 携带可读信息。
 */
public class DefaultWorkflowSandboxClient implements WorkflowSandboxClient {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final long RESPONSE_MARGIN_MS = 2_000L;
    private static final long MIN_TIMEOUT_MS = 5_000L;

    private final HttpClient httpClient;

    private final String baseUrl;

    private final String executePath;

    public DefaultWorkflowSandboxClient(String baseUrl) {
        this(baseUrl, HttpClient.newHttpClient());
    }

    public DefaultWorkflowSandboxClient(String baseUrl, HttpClient httpClient) {
        this.httpClient = httpClient;
        this.baseUrl = stripTrailingSlash(baseUrl);
        this.executePath = this.baseUrl + "/sandbox/execute";
    }

    @Override
    public CompletableFuture<SandboxExecuteResponse> execute(SandboxExecuteRequest request) {
        try {
            Duration timeout = Duration.ofMillis(Math.max(MIN_TIMEOUT_MS, request.limitsOrDefault().timeoutMsOrDefault() + RESPONSE_MARGIN_MS));
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(executePath))
                    .timeout(timeout)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(MAPPER.writeValueAsString(request)))
                    .build();
            return httpClient.sendAsync(httpRequest, HttpResponse.BodyHandlers.ofString())
                    .thenApply(this::toResponse)
                    .exceptionally(ex -> SandboxExecuteResponse.failure(
                            ErrorCategory.PLATFORM,
                            SandboxErrorCodes.SANDBOX_INTERNAL,
                            "沙箱服务不可达（" + baseUrl + "）: " + rootMessage(unwrap(ex))));
        } catch (Exception e) {
            return CompletableFuture.failedFuture(new IllegalStateException("构建沙箱请求失败: " + e.getMessage(), e));
        }
    }

    /**
     * 穿透 {@code CompletionException / ExecutionException} 包装，返回最内层 cause。
     * 传输层失败（连接被拒/超时）多以包装异常浮现，穿透后才能在错误详情里给出真实原因。
     */
    private static Throwable unwrap(Throwable t) {
        Throwable cur = t;
        while ((cur instanceof CompletionException || cur instanceof ExecutionException) && cur.getCause() != null) {
            cur = cur.getCause();
        }
        return cur;
    }

    /**
     * 取 cause 链最深一层的非空 message；全程无有效 message 时回退到异常类名（否则 {@code null}
     * message 会被上层透成空字符串，令 NODE_FAILED 无任何可读信息）。
     */
    private static String rootMessage(Throwable t) {
        Throwable cur = t;
        String deepest = null;
        while (cur != null) {
            if (cur.getMessage() != null && !cur.getMessage().isBlank()) {
                deepest = cur.getMessage();
            }
            cur = cur.getCause();
        }
        if (deepest != null) {
            return deepest;
        }
        Throwable root = t;
        while (root != null && root.getCause() != null) {
            root = root.getCause();
        }
        return root == null ? "未知错误" : root.getClass().getSimpleName();
    }

    private SandboxExecuteResponse toResponse(HttpResponse<String> httpResponse) {
        if (httpResponse.statusCode() >= 200 && httpResponse.statusCode() < 300) {
            try {
                return MAPPER.readValue(httpResponse.body(), SandboxExecuteResponse.class);
            } catch (Exception e) {
                return SandboxExecuteResponse.failure(ErrorCategory.PLATFORM, SandboxErrorCodes.SANDBOX_INTERNAL,
                        "沙箱响应解析失败: " + e.getMessage());
            }
        }
        return SandboxExecuteResponse.failure(ErrorCategory.PLATFORM, SandboxErrorCodes.SANDBOX_INTERNAL,
                "沙箱服务返回 HTTP " + httpResponse.statusCode() + ": " + truncate(httpResponse.body()));
    }

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static String truncate(String s) {
        return s.length() <= 200 ? s : s.substring(0, 200) + "…";
    }
}
