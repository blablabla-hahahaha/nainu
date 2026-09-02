package nainu.top.agi.sandbox.starter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 沙箱服务控制面：唯一负责无状态代码执行（run code → return result）的可执行组件。
 *
 * <p>按所选策略调度隔离的沙箱（默认 {@code -local}，可换 {@code -kubernetes}）；master 仅经 HTTP 单向调用，
 * 不共享实例。策略装配必须恰好一个，缺失或多选都大声失败（配置错误大声失败）。
 */
@SpringBootApplication
@EnableScheduling
public class SandboxStarterApplication {

    public static void main(String[] args) {
        SpringApplication.run(SandboxStarterApplication.class, args);
    }
}
