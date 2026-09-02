package nainu.top.agi.sandbox;

/**
 * 沙箱执行策略 SPI（服务端侧）：按所选策略调度隔离的沙箱并执行一段代码。
 *
 * <p>实现以 {@code @AutoConfiguration + @ConditionalOnMissingBean(SandboxStrategy)} 注册，
 * 经 {@code META-INF/spring/...AutoConfiguration.imports} 装配；沙箱服务必须恰好装配一个策略。
 */
public interface SandboxStrategy {

    /** 策略标识（{@code local} / {@code kubernetes}），供 {@code sandbox.type} 显式选择。 */
    String type();

    /**
     * 执行一段脚本并返回结果。
     *
     * <p>实现须同步（本地子进程 / 集群 Pod 提交+等待），失败经 {@link SandboxExecuteResponse#errorCategory}
     * 归类透出，不抛未分类异常（除非平台自身 bug）。跨执行不留状态：每次执行起全新解释器。
     */
    SandboxExecuteResponse execute(SandboxExecuteRequest request);
}
