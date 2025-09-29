package nainu.top.agi.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import nainu.top.agi.dal.pgsql.model.ChatConversation;
import reactor.core.publisher.Flux;

@RequiredArgsConstructor
public class ConversationTool implements AgentTool {

    private final ChatConversation conversation;

    private final AgentHandler agentHandler;

    @Override
    public String getName() {
        return conversation.getFunctionName();
    }

    @Override
    public String getDescription() {
        return conversation.getDescription();
    }

    @Override
    public String getParameters() {
        return """
            {
                "type": "object",
                "properties": {
                    "user_prompt": {
                        "type": "string",
                        "description": "用户的提示或问题"
                    }
                },
                "required": ["user_prompt"]
            }
        """;
    }

    @Override
    public Flux<AgentMessage> call(
        ChatConversation root,
        ChatConversation parent,
        String arguments) {

        String question;
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode jsonNode = objectMapper.readTree(arguments);
            question = jsonNode.get("user_prompt").asText();
        } catch (Exception e) {
            return Flux.error(new RuntimeException("Failed to parse arguments: " + e.getMessage()));
        }

        return agentHandler.handle(root, parent, conversation, question);
    }
}
