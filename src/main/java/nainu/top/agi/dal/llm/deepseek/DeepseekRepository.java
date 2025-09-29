package nainu.top.agi.dal.llm.deepseek;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nainu.top.agi.dal.llm.LlmMessage;
import nainu.top.agi.dal.llm.LlmResponse;
import nainu.top.agi.agent.AgentTool;
import org.apache.commons.text.StringEscapeUtils;
import org.springframework.stereotype.Repository;
import org.springframework.util.ObjectUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Repository
@RequiredArgsConstructor
public class DeepseekRepository {

    public static final String CONFIG_MODEL = "modelName";
    public static final String CONFIG_MAX_TOKEN = "maxToken";

    private final ObjectMapper objectMapper;

    private final WebClient webClient = WebClient.create("https://api.deepseek.com");

    private String getToolSchema (List<AgentTool> tools) {
        return tools.stream().map(tool -> {
            String TOOL_SCHEMA = """
            {
                "type": "function",
                "function": {
                    "name": "{name}",
                    "description": "{description}",
                    "parameters": {parameters}
                }
            }
            """;
            return TOOL_SCHEMA
                    .replace("{name}", tool.getName())
                    .replace("{description}", tool.getDescription())
                    .replace("{parameters}", tool.getParameters());
        }).collect(Collectors.joining(",", "[", "]"));
    }

    private String getToolCallsSchema (LlmMessage message) {
        if (ObjectUtils.isEmpty(message.getToolCallName())) {
            return "[]";
        }
        String TOOL_CALLS_TEMPLATE = """
                [{
                    "index" : 0,
                    "id" : "{tool_call_id}",
                    "type" : "function",
                    "function" : {
                      "name" : "{tool_name}",
                      "arguments" : ""
                    }
                }]
                """;
        String callId = Optional.ofNullable(message.getToolCallId()).orElse("");
        String toolCallName = Optional.ofNullable(message.getToolCallName()).orElse("");
        return TOOL_CALLS_TEMPLATE.replace("{tool_call_id}", callId)
                .replace("{tool_name}", toolCallName);
    }

    private String getMessagesSchema (List<LlmMessage> messages) {
        return messages.stream().map(message -> {
            String MESSAGE_TEMPLATE = """
                {
                  "reasoning_content": "{reasoning_content}",
                  "content": "{content}",
                  "tool_call_id": "{tool_call_id}",
                  "tool_calls": {tool_calls},
                  "role": "{role}"
                }
                """;
            String escapedReasoning = Optional.ofNullable(StringEscapeUtils.escapeJson(message.getReasoning())).orElse("");
            String escapedContent = StringEscapeUtils.escapeJson(message.getContent());
            return MESSAGE_TEMPLATE
                    .replace("{reasoning_content}", escapedReasoning)
                    .replace("{content}", escapedContent)
                    .replace("{tool_call_id}", Optional.ofNullable(message.getToolCallId()).orElse(""))
                    .replace("{tool_calls}", getToolCallsSchema(message))
                    .replace("{role}", message.getRoleType().name().toLowerCase());
        }).collect(Collectors.joining(",", "[", "]"));
    }

    private String getBodySchema(JsonNode config, List<AgentTool> tools, List<LlmMessage> messages) {
        String BODY_TEMPLATE = """
                {
                  "messages": {messages},
                  "model": "{model}",
                  "thinking": {
                    "type": "enabled"
                  },
                  "frequency_penalty": 0,
                  "max_tokens": {max_tokens},
                  "presence_penalty": 0,
                  "response_format": {
                    "type": "text"
                  },
                  "stop": null,
                  "stream": true,
                  "stream_options": null,
                  "temperature": 1,
                  "top_p": 1,
                  "tools": {tools},
                  "tool_choice": "auto",
                  "logprobs": false,
                  "top_logprobs": null
                }
                """;
        return BODY_TEMPLATE
                .replace("{messages}", getMessagesSchema(messages))
                .replace("{model}", config.path(CONFIG_MODEL).asText("deepseek-reasoner"))
                .replace("{max_tokens}", config.path(CONFIG_MAX_TOKEN).asText("4096"))
                .replace("{tools}", getToolSchema(tools));
    }

    private JsonNode getFunction(JsonNode delta) {
        JsonNode toolCalls = delta.path("tool_calls");
        if (toolCalls.isArray() && !toolCalls.isEmpty()) {
            JsonNode call = toolCalls.valueStream().findFirst().orElse(objectMapper.nullNode());
            if (Objects.nonNull(call)) {
                return call;
            }
        }
        return objectMapper.nullNode();
    }

    public Flux<LlmResponse> stream(JsonNode config, List<AgentTool> tools, List<LlmMessage> messages) {
        String body = getBodySchema(config, tools, messages);
        String responseId = UUID.randomUUID().toString();

        return webClient.post()
                .uri("/chat/completions")
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer sk-ca90817501b64287aeaa727b9b4d5999")
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .mapNotNull(chunk -> {
                    if (Objects.equals(chunk, "[DONE]")) {
                        return LlmResponse.builder()
                                .id(responseId)
                                .status(LlmResponse.LlmResponseStatus.DONE)
                                .build();
                    }
                    try {
                        String jsonContent = chunk.startsWith("data: ") ? chunk.substring(6).trim() : chunk.trim();
                        if (jsonContent.isEmpty()) {
                            return null;
                        }
                        JsonNode jsonNode = objectMapper.readTree(jsonContent);
                        JsonNode choices = jsonNode.path("choices");
                        if (choices.isArray() && !choices.isEmpty()) {
                            JsonNode delta = choices.get(0).path("delta");
                            JsonNode call = getFunction(delta);
                            JsonNode function = call.path("function");
                            return LlmResponse.builder()
                                    .id(responseId)
                                    .content(delta.path("content").asText(""))
                                    .reasoning(delta.path("reasoning_content").asText(""))
                                    .callId(call.path("id").asText(""))
                                    .callName(function.path("name").asText(""))
                                    .callArguments(function.path("arguments").asText(""))
                                    .status(LlmResponse.LlmResponseStatus.LOADING)
                                    .build();
                        }
                        return null;
                    } catch (JsonProcessingException e) {
                        log.error("Failed to parse streaming response chunk: {}", chunk, e);
                        throw new RuntimeException(e);
                    }
                })
                .filter(Objects::nonNull);
    }
}
