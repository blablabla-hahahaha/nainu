package nainu.top.agi.master.config;

import nainu.top.agi.sandbox.DefaultWorkflowSandboxClient;
import nainu.top.agi.sandbox.WorkflowSandboxClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 沙箱客户端装配：master 经 HTTP 单向调用沙箱服务，只依赖契约 SDK（{@code -template}）与沙箱服务地址。
 *
 * <p>配置错误大声失败：此处默认回退到本机地址便于 clone 即跑；显式配置的地址无效时由客户端在调用时暴露。
 */
@Configuration
public class SandboxClientConfig {

    @Bean
    public WorkflowSandboxClient workflowSandboxClient(
            @Value("${nainu-agi.sandbox.base-url:http://localhost:8090}") String baseUrl) {
        return new DefaultWorkflowSandboxClient(baseUrl);
    }
}
