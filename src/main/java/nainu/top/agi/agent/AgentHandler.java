package nainu.top.agi.agent;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import nainu.top.agi.dal.llm.LlmMessage;
import nainu.top.agi.dal.llm.deepseek.DeepseekRepository;
import nainu.top.agi.dal.pgsql.model.ChatConversation;
import nainu.top.agi.dal.pgsql.model.ChatMessage;
import org.springframework.stereotype.Component;
import org.springframework.util.ObjectUtils;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public class AgentHandler {

    private final DeepseekRepository deepseekRepository;

    private final AgentSupport agentSupport;

//    private final Function<AgentContext, Flux<ServerSentEvent<?>>> after;

    public static final String CONFIG_SYSTEM_PROMPT = "systemPrompt";

    public Flux<AgentMessage> handle(
        ChatConversation root,
        ChatConversation parent,
        ChatConversation conversation,
        String question) {

        JsonNode config = conversation.getConfig();
        String systemPrompt = config.path(CONFIG_SYSTEM_PROMPT).asText();

        // 初始化 Agent 消息记录
        List<LlmMessage> llmMessages = new ArrayList<>();
        if (StringUtils.hasText(systemPrompt)) {
            llmMessages.add(LlmMessage.buildSystemMessage(systemPrompt));
        }
        llmMessages.add(LlmMessage.buildUserMessage(question));

        // 设置上级节点
        if (Objects.isNull(root) || Objects.isNull(parent)) {
            root = conversation;
            parent = conversation;
        }

        // 获取 Agent 所需要用到的工具
        Mono<List<AgentTool>> agentTools = agentSupport.getAgentTool(config, this);
        ChatConversation finalRoot = root;
        ChatConversation finalParent = parent;
        return agentTools.flatMapMany(tools -> doHandle(finalRoot, finalParent, conversation, llmMessages, tools));
    }

    private Flux<AgentMessage> doHandle(
        ChatConversation root,
        ChatConversation parent,
        ChatConversation conversation,
        List<LlmMessage> llmMessages,
        List<AgentTool> agentTools) {

        JsonNode config = conversation.getConfig();
        LlmMessage assistantMessage = LlmMessage.builder().roleType(ChatMessage.RoleType.ASSISTANT).build();
        StringBuilder toolResponse = new StringBuilder();
        return Flux.concat(
                // 请求模型
                deepseekRepository.stream(config, agentTools, llmMessages).doOnNext(response -> {
                    assistantMessage.appendContent(response.getContent());
                    assistantMessage.appendReasoning(response.getReasoning());
                    assistantMessage.appendToolCallId(response.getCallId());
                    assistantMessage.appendToolCallName(response.getCallName());
                    assistantMessage.appendToolCallArguments(response.getCallArguments());
                }).map(response -> {
                    // 将模型消息转换为 Agent 消息
                    return AgentMessage.builder()
                            .id(response.getId())
                            .reasoning(response.getReasoning())
                            .content(response.getContent())
                            .status(response.getStatus())
                            .title(conversation.getTitle())
                            .conversationId(conversation.getId())
                            .parentConversationId(parent.getId())
                            .rootConversationId(root.getId())
                            .build();
                }),

                // 根据模型响应，尝试从工具库中选择一个进行调用，如果不需要调用，则返回 Empty Flux
                Flux.defer(() -> {
                    return agentSupport.invokeTool(root, conversation, agentTools, assistantMessage).doOnNext(response -> {
                        toolResponse.append(response.getContent());
                    });
                }),

                // 获取工具结果后，继续处理
                Flux.defer(() -> {
                    if (ObjectUtils.isEmpty(toolResponse)) {
                        return Flux.empty();
                    }
                    llmMessages.add(assistantMessage);
                    llmMessages.add(LlmMessage.buildToolMessage(toolResponse, assistantMessage.getToolCallId()));
                    return doHandle(root, parent, conversation, llmMessages, agentTools);
                })
        );
    }
}
