package nainu.top.agi.dal.llm.ollama;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.text.StringEscapeUtils;
import org.springframework.stereotype.Repository;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Slf4j
@Repository
@RequiredArgsConstructor
public class OllamaRepository {

    private final ObjectMapper objectMapper;

    private final WebClient webClient = WebClient.create("http://localhost:11434");

    private String getBodySchema(String text) {
        String BODY_TEMPLATE = """
        {
            "model": "{model}",
            "input": "{input}"
        }
        """;
        return BODY_TEMPLATE
                .replace("{model}", "qwen3-embedding:4b")
                .replace("{input}", StringEscapeUtils.escapeJson(text));
    }

    public Mono<float[]> getEmbed (String text) {
        String bodySchema = getBodySchema(text);
        return webClient.post()
                .uri("http://localhost:11434/api/embed")
                .bodyValue(bodySchema)
                .retrieve()
                .bodyToMono(String.class)
                .mapNotNull(chunk -> {
                    try {
                        JsonNode jsonNode = objectMapper.readTree(chunk);
                        JsonNode embeddings = jsonNode.get("embeddings");
                        return objectMapper.convertValue(embeddings.get(0), float[].class);
                    } catch (Exception e) {
                        log.error("Failed to parse streaming response chunk: {}", chunk, e);
                        throw new RuntimeException(e);
                    }
                });
    }
}