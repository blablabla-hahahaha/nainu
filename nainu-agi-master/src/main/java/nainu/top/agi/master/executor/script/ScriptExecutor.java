package nainu.top.agi.master.executor.script;

import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.common.exception.ErrorCategory;
import nainu.top.agi.common.exception.WorkflowException;
import nainu.top.agi.master.executor.NodeExecuteRequest;
import nainu.top.agi.master.executor.NodeExecutor;
import nainu.top.agi.sandbox.SandboxErrorCodes;
import nainu.top.agi.sandbox.SandboxExecuteRequest;
import nainu.top.agi.sandbox.SandboxExecuteResponse;
import nainu.top.agi.sandbox.SandboxLanguage;
import nainu.top.agi.sandbox.SandboxLimits;
import nainu.top.agi.sandbox.WorkflowSandboxClient;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

/**
 * 编码节点执行器：master 侧的远程 HTTP 客户端（执行真正发生在独立沙箱服务）。
 *
 * <p>把 {@code config.language} + {@code config.script} + 已解析输入（{@code params}）打包为
 * {@link SandboxExecuteRequest}，经 {@link WorkflowSandboxClient} 发给沙箱服务，并把响应结果按
 * {@code node.output} 映射写回状态。执行是异步的（{@link #executeAsync}），不阻塞事件循环线程。
 *
 * <p>脚本前置于一次 Python 静态黑名单校验（禁 {@code subprocess} / 文件写 / {@code eval} 等），
 * 沙箱内再经隔离；错误沿现存三件套契约归类（脚本问题 → {@code AUTHORING}；不支持语言/超时/服务问题 → {@code PLATFORM}）。
 * 脚本应无副作用或幂等（graph-core at-least-once 语义下节点可能重跑）。
 */
@Component
public class ScriptExecutor implements NodeExecutor {

    private final WorkflowSandboxClient sandboxClient;

    public ScriptExecutor(WorkflowSandboxClient sandboxClient) {
        this.sandboxClient = sandboxClient;
    }

    @Override
    public NodeDefinition.NodeType getType() {
        return NodeDefinition.NodeType.SCRIPT;
    }

    @Override
    public Map<String, Object> execute(NodeExecuteRequest request) {
        try {
            return executeAsync(request).join();
        } catch (CompletionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof WorkflowException we) {
                throw we;
            }
            throw new WorkflowException(ErrorCategory.PLATFORM, SandboxErrorCodes.SANDBOX_INTERNAL,
                    "沙箱调用失败: " + (cause == null ? "unknown" : cause.getMessage()), false, cause);
        }
    }

    @Override
    public CompletableFuture<Map<String, Object>> executeAsync(NodeExecuteRequest request) {
        try {
            SandboxExecuteRequest sandboxRequest = toSandboxRequest(request);
            return sandboxClient.execute(sandboxRequest).thenApply(this::mapResponse);
        } catch (Exception e) {
            return CompletableFuture.failedFuture(e);
        }
    }

    private SandboxExecuteRequest toSandboxRequest(NodeExecuteRequest request) {
        Map<String, Object> config = request.getConfig();
        if (config == null) {
            throw new WorkflowException(ErrorCategory.AUTHORING, SandboxErrorCodes.SANDBOX_EMPTY,
                    "脚本节点缺少 config（language/script）");
        }
        String languageCode = String.valueOf(config.getOrDefault("language", "javascript"));
        String script = config.get("script") == null ? null : String.valueOf(config.get("script"));
        if (!StringUtils.hasText(script)) {
            throw new WorkflowException(ErrorCategory.AUTHORING, SandboxErrorCodes.SANDBOX_EMPTY, "脚本内容为空");
        }
        SandboxLanguage language = parseLanguage(languageCode);
        if (language == SandboxLanguage.PYTHON && containsForbiddenOperation(script)) {
            throw new WorkflowException(ErrorCategory.AUTHORING, SandboxErrorCodes.SANDBOX_STATIC_CHECK_FAILED,
                    "脚本包含被禁止的危险操作（subprocess / 文件写 / eval 等），已在沙箱外拦截");
        }
        Map<String, Object> params = request.getResolvedInputs() == null ? Map.of() : request.getResolvedInputs();
        String image = config.get("image") == null ? null : String.valueOf(config.get("image"));
        return new SandboxExecuteRequest(language, script, params, parseLimits(config.get("limits")), image, null, request.getNodeId());
    }

    private Map<String, Object> mapResponse(SandboxExecuteResponse response) {
        if (response.success()) {
            return response.result() == null ? Map.of() : response.result();
        }
        ErrorCategory category = response.errorCategory() == null ? ErrorCategory.PLATFORM : response.errorCategory();
        String detail = response.detail() != null ? response.detail()
                : (StringUtils.hasText(response.stderr()) ? response.stderr() : "沙箱执行失败");
        throw new WorkflowException(category, response.errorCode(), detail, false, null);
    }

    private static SandboxLanguage parseLanguage(String code) {
        try {
            return SandboxLanguage.fromCode(code);
        } catch (IllegalArgumentException e) {
            throw new WorkflowException(ErrorCategory.PLATFORM, SandboxErrorCodes.SANDBOX_UNSUPPORTED_LANGUAGE,
                    "暂不支持脚本语言: " + code, false, e);
        }
    }

    private static SandboxLimits parseLimits(Object limits) {
        if (!(limits instanceof Map<?, ?> m)) {
            return SandboxLimits.DEFAULT;
        }
        return new SandboxLimits(toLong(m.get("timeoutMs")), toLong(m.get("maxMemoryMb")), toLong(m.get("maxOutputBytes")));
    }

    private static Long toLong(Object value) {
        if (value instanceof Number n) {
            return n.longValue();
        }
        return null;
    }

    /**
     * Python 静态黑名单：禁 subprocess / 文件写 / eval 等危险操作（大小写不敏感子串匹配）。
     * 这是沙箱外的前置一层，属启发式、会过度拦截（如变量名含 socket），以安全为先。
     */
    private static boolean containsForbiddenOperation(String script) {
        String lower = script.toLowerCase();
        for (String token : FORBIDDEN_TOKENS) {
            if (lower.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private static final List<String> FORBIDDEN_TOKENS = List.of(
            "import subprocess", "from subprocess",
            "os.system", "os.popen", "os.spawn", "os.execl", "os.execv",
            "os.remove", "os.unlink", "os.rmdir", "os.rename", "os.chmod", "os.chown", "os.kill",
            "shutil.", "__import__", "eval(", "exec(", "compile(", "open(", "file(", "socket", "pty");
}
