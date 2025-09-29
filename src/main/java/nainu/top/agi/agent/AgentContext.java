package nainu.top.agi.agent;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.Getter;
import nainu.top.agi.dal.pgsql.model.ChatConversation;

import java.util.List;

@Getter
@Builder
public class AgentContext {

    public static final String CONFIG_SYSTEM_PROMPT = "systemPrompt";

    public static final String CONFIG_CONVERSATION_TOOLS = "conversationTools";

    private final ChatConversation conversation;

    private final String assistantResponse;

    private final String assistantReasoning;

    public String getSystemPrompt() {
        return getConfig().path(CONFIG_SYSTEM_PROMPT).asText();
    }

    public JsonNode getConfig() {
        return conversation.getConfig();
    }

    /**
     * 获取会话 Ids【用来做工具的会话】
     * @return  会话id列表
     */
    public List<String> getConversationToolIds() {
        JsonNode tools = getConfig().path(CONFIG_CONVERSATION_TOOLS);
        return tools.valueStream().map(JsonNode::asText).toList();
    }

    /**
     * 从 AgentContext 拷贝一个 AgentContextBuilder
     * @param agentContext AgentContext
     * @return AgentContextBuilder
     */
    public static AgentContextBuilder copyBuilder(AgentContext agentContext) {
        return AgentContext.builder()
                .conversation(agentContext.getConversation())
                .assistantResponse(agentContext.getAssistantResponse())
                .assistantReasoning(agentContext.getAssistantReasoning());
    }
}
