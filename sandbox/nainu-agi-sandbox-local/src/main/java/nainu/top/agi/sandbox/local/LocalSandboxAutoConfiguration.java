package nainu.top.agi.sandbox.local;

import nainu.top.agi.sandbox.SandboxStrategy;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;

/**
 * 本地策略自动装配：默认（未指定 {@code sandbox.type}，或显式为 {@code local}）且尚无其它
 * {@link SandboxStrategy} 时注册本地策略。只有 {@code -local} 在 classpath 时即 clone 即跑。
 */
@AutoConfiguration
@ConditionalOnMissingBean(SandboxStrategy.class)
@ConditionalOnProperty(name = "sandbox.type", havingValue = "local", matchIfMissing = true)
public class LocalSandboxAutoConfiguration {

    @Bean
    public SandboxStrategy localSandboxStrategy() {
        return new LocalSandboxStrategy();
    }
}
