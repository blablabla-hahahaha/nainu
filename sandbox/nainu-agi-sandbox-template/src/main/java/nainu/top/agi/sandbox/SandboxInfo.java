package nainu.top.agi.sandbox;

/**
 * 已绑定沙箱的可重连元数据。
 *
 * <p>集群策略时对应 K8s 里的真实对象（namespace / Pod label / service URL），集群 API 即共享真源，
 * 跨进程/跨 Pod 重连可靠；本地策略（{@code EPHEMERAL}）无真实对象，仅作会话占位。
 *
 * @param sandboxId   沙箱 id（会话绑定主键）。
 * @param workflowId  绑定的工作流 id。
 * @param namespace   集群命名空间（本地策略为空）。
 * @param endpoint    沙箱端点（集群时 service URL；本地时为本地标识）。
 * @param status      状态：{@code EPHEMERAL} / {@code RUNNING} / {@code TERMINATED}。
 */
public record SandboxInfo(String sandboxId, String workflowId, String namespace, String endpoint, String status) {

    public static final String STATUS_EPHEMERAL = "EPHEMERAL";
    public static final String STATUS_RUNNING = "RUNNING";
    public static final String STATUS_TERMINATED = "TERMINATED";

    public static SandboxInfo ephemeral(String workflowId) {
        return new SandboxInfo("local-" + workflowId, workflowId, null, null, STATUS_EPHEMERAL);
    }
}
