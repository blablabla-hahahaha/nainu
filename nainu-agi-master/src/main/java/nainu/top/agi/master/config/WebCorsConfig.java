package nainu.top.agi.master.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.config.CorsRegistry;
import org.springframework.web.reactive.config.WebFluxConfigurer;

/**
 * WebFlux CORS 配置：允许本地前端开发服务器（Vite）跨域访问 /api/**。
 *
 * <p>SSE（EventSource）与 REST 同受此配置约束；生产环境应收紧为真实前端源。
 */
@Configuration
public class WebCorsConfig implements WebFluxConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("http://localhost:5173", "http://127.0.0.1:5173",
                        "http://localhost:5175", "http://127.0.0.1:5175")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
