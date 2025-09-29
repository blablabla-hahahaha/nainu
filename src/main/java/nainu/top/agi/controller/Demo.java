package nainu.top.agi.controller;

import nainu.top.agi.model.ChatRequestParams;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.deepseek.DeepSeekChatModel;
import org.springframework.ai.deepseek.DeepSeekChatOptions;
import org.springframework.ai.deepseek.api.DeepSeekApi;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
public class Demo {

    private final DeepSeekChatModel chatModel = DeepSeekChatModel.builder()
            .deepSeekApi(DeepSeekApi.builder().apiKey("sk-8a4d521aadb54e05947240d9a22909e7").build())
            .build();

    @PostMapping("/ai/stream_chat")
    public Flux<ChatResponse> stream(@RequestBody ChatRequestParams params) {
        return ChatClient.create(chatModel)
                .prompt(params.getPrompt())
                .system(params.getSystem())
                .options(DeepSeekChatOptions.builder()
                        .model(params.getModel())
                        .temperature(params.getTemperature())
                        .topP(params.getTopP())
                        .maxTokens(params.getMaxTokens())
                        .build())
                .stream().chatResponse();
    }
}