package nainu.top.agi.agent;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import nainu.top.agi.dal.llm.LlmMessage;
import nainu.top.agi.dal.pgsql.ChatConversationRepository;
import nainu.top.agi.dal.pgsql.model.ChatConversation;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class AgentSupport {

    public static final String CONFIG_CONVERSATION_TOOLS = "conversationTools";

    private final ChatConversationRepository conversationRepository;

    /**
     * 获取可供 Agent 调用的工具
     * @param config    Agent config
     * @return          Agent tools
     */
    public Mono<List<AgentTool>> getAgentTool(JsonNode config, AgentHandler handler) {
        JsonNode conversationTools = config.path(CONFIG_CONVERSATION_TOOLS);
        List<String> conversationToolIds = conversationTools.valueStream().map(JsonNode::asText).toList();

        if (!conversationToolIds.isEmpty()) {
            return conversationRepository.findByIds(conversationToolIds)
                    .map(tool -> (AgentTool) new ConversationTool(tool, handler))
                    .collectList();
        }
        return Mono.just(List.of());
    }

    /**
     * 如果有工具需要调用，则尝试调用。否则返回一个 Empty Flux
     * @param tools                 工具库
     * @param assistantMessage      模型响应，用来判断是否需要从工具库中选择一个工具进行调用
     * @return  工具响应，如不需要调用，则返回一个 Empty Flux
     */
    public Flux<AgentMessage> invokeTool(
        ChatConversation root,
        ChatConversation parent,
        List<AgentTool> tools,
        LlmMessage assistantMessage) {

        Optional<AgentTool> toolCallOptional = tools.stream()
                .filter(tool -> Objects.equals(tool.getName(), assistantMessage.getToolCallName()))
                .findFirst();

        if (toolCallOptional.isEmpty()) {
            return Flux.empty();
        }
        AgentTool tool = toolCallOptional.get();
        return tool.call(root, parent, assistantMessage.getToolCallArguments());
    }
}
