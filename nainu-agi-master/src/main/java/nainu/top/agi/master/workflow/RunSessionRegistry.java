package nainu.top.agi.master.workflow;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 运行会话注册表（进程内）：pause/resume/stream 按 runId 定位会话。
 *
 * <p>单实例阶段一成立；多实例暂停/续跑需 Redis 协调（挂起项，与 gateway 同批）。
 */
@Component
public class RunSessionRegistry {

    private final Map<String, RunSession> sessions = new ConcurrentHashMap<>();

    public RunSession get(String runId) {
        return sessions.get(runId);
    }

    /**
     * @return 已存在的同名会话；无则 null
     */
    public RunSession put(String runId, RunSession session) {
        return sessions.put(runId, session);
    }

    public RunSession remove(String runId) {
        return sessions.remove(runId);
    }
}
