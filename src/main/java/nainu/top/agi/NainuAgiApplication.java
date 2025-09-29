package nainu.top.agi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(exclude = org.springframework.ai.model.deepseek.autoconfigure.DeepSeekChatAutoConfiguration.class)
public class NainuAgiApplication {

    public static void main(String[] args) {
        SpringApplication.run(NainuAgiApplication.class, args);
    }

}
