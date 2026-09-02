package nainu.top.agi.sandbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import nainu.top.agi.common.exception.ErrorCategory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;

/**
 * {@link WorkflowSandboxClient} 的 JDK {@link HttpClient} 实现（无外置 HTTP 依赖，契约模块保持轻）。
 *
 * <p>非阻塞：{@code sendAsync} 在其自身线程池执行 IO，不阻塞事件循环线程。
 * 服务端 2xx 一律反序列化为 {@link SandboxExecuteResponse}（含分类错误）；非 2xx 收敛为
 * {@link ErrorCategory#PLATFORM} 响应（SANDBOX_INTERNAL），仅传输不可达时失败。
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
                    .thenApply(this::toResponse);
        } catch (Exception e) {
            return CompletableFuture.failedFuture(new IllegalStateException("构建沙箱请求失败: " + e.getMessage(), e));
        }
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
