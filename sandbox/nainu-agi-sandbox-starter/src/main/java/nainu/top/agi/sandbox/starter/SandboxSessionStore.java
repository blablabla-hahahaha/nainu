package nainu.top.agi.sandbox.starter;

import nainu.top.agi.sandbox.SandboxInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 沙箱会话绑定：按 {@code workflow_id}（或 session）绑定一个沙箱，保存 {@link SandboxInfo}。
 *
 * <p>本地策略为占位会话（{@code EPHEMERAL}）；集群策略时对应 K8s 真实对象，集群 API 即共享真源，
 * 跨进程/跨 Pod 重连可靠。超时（{@code sandbox.session.ttl}）后定时回收，避免占位泄漏。
 */
@Component
public class SandboxSessionStore {

    private final Map<String, TimedSandbox> sessions = new ConcurrentHashMap<>();

    private final Duration ttl;

    public SandboxSessionStore(@Value("${sandbox.session.ttl:30m}") Duration ttl) {
        this.ttl = ttl;
    }

    public void bind(String workflowId, SandboxInfo info) {
        sessions.put(workflowId, new TimedSandbox(info, System.currentTimeMillis()));
    }

    public SandboxInfo get(String workflowId) {
        TimedSandbox entry = sessions.get(workflowId);
        return entry == null ? null : entry.info();
    }

    public void remove(String workflowId) {
        sessions.remove(workflowId);
    }

    /** 定时回收过期会话；清理尽力而为，不因单条失败抛出。 */
    @Scheduled(fixedDelayString = "${sandbox.session.cleanup-ms:600000}")
    public void cleanup() {
        long threshold = System.currentTimeMillis() - ttl.toMillis();
        sessions.entrySet().removeIf(e -> e.getValue().createdAt() < threshold);
    }

    private record TimedSandbox(SandboxInfo info, long createdAt) {
    }
}
