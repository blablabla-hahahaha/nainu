package nainu.top.agi.sandbox.starter;

import nainu.top.agi.common.exception.ErrorCategory;
import nainu.top.agi.sandbox.SandboxErrorCodes;
import nainu.top.agi.sandbox.SandboxExecuteRequest;
import nainu.top.agi.sandbox.SandboxExecuteResponse;
import nainu.top.agi.sandbox.SandboxInfo;
import nainu.top.agi.sandbox.SandboxStrategy;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

/**
 * 沙箱服务：装配恰好一个 {@link SandboxStrategy}，处理会话绑定 / 生命周期与 execute API。
 *
 * <p>策略装配缺失或多选都在启动即失败（配置错误大声失败）；脚本空内容、会话绑定在此统一处理，
 * 具体执行委托给策略（本地子进程 / 集群 Pod）。
 */
@Service
public class SandboxService {

    private final SandboxStrategy strategy;

    private final SandboxSessionStore sessionStore;

    public SandboxService(ObjectProvider<SandboxStrategy> strategyProvider, SandboxSessionStore sessionStore) {
        // 恰好一个策略；缺失返回 null（大声失败），多选抛 NoUniqueBeanDefinitionException（不得静默取默认）。
        SandboxStrategy resolved = strategyProvider.getIfAvailable();
        if (resolved == null) {
            throw new IllegalStateException("无 SandboxStrategy bean 可用——需装配恰好一个沙箱策略（默认 -local）");
        }
        this.strategy = resolved;
        this.sessionStore = sessionStore;
    }

    public SandboxStrategy strategy() {
        return strategy;
    }

    public SandboxExecuteResponse execute(SandboxExecuteRequest request) {
        if (request.script() == null || request.script().isBlank()) {
            return SandboxExecuteResponse.failure(ErrorCategory.AUTHORING, SandboxErrorCodes.SANDBOX_EMPTY, "脚本内容为空");
        }
        if (request.workflowId() != null && !request.workflowId().isBlank()) {
            sessionStore.bind(request.workflowId(), SandboxInfo.ephemeral(request.workflowId()));
        }
        return strategy.execute(request);
    }
}
