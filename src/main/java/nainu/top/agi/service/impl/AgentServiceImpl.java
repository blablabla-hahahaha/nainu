package nainu.top.agi.service.impl;

import io.micrometer.common.util.StringUtils;
import lombok.RequiredArgsConstructor;
import nainu.top.agi.agent.AgentHandler;
import nainu.top.agi.dal.llm.ollama.OllamaRepository;
import nainu.top.agi.dal.pgsql.ChatConversationRepository;
import nainu.top.agi.dal.pgsql.ChatMessageRepository;
import nainu.top.agi.dal.pgsql.model.ChatConversation;
import nainu.top.agi.dal.pgsql.model.ChatMessage;
import nainu.top.agi.model.AgentChatParams;
import nainu.top.agi.model.SaveConversationRequest;
import nainu.top.agi.model.converter.SSEConverter;
import nainu.top.agi.service.AgentService;
import nainu.top.agi.util.FunctionNameGenerator;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AgentServiceImpl implements AgentService {

    private final OllamaRepository ollamaRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatConversationRepository chatConversationRepository;
    private final AgentHandler agentHandler;

    @Override
    @Transactional
    public Mono<ChatConversation> saveConversation(SaveConversationRequest request) {
        ChatConversation initConversation = ChatConversation.builder()
                .id(request.getId())
                .title(request.getTitle())
                .description(request.getDescription())
                .userId("default_user")
                .functionName(FunctionNameGenerator.generate())
                .createdAt(LocalDateTime.now())
                .config(request.getConfig())
                .build();

        if (StringUtils.isBlank(request.getId())) {
            return chatConversationRepository.save(initConversation);
        }

        return chatConversationRepository.findById(request.getId()).flatMap(conversation -> {
            if (Objects.isNull(conversation)) {
                return Mono.error(new RuntimeException("会话不存在"));
            }
            conversation.setTitle(request.getTitle());
            conversation.setDescription(request.getDescription());
            conversation.setConfig(initConversation.getConfig());
            return chatConversationRepository.save(conversation);
        });
    }

    @Override
    @Transactional
    public Mono<Void> deleteConversation(String id) {
        return chatMessageRepository.deleteByConversationId(id)
                .then(Mono.defer(() -> chatConversationRepository.deleteById(id)));
    }

    @Override
    public Mono<Void> clearConversation(String id) {
        return chatMessageRepository.deleteByConversationId(id);
    }

    @Override
    public Mono<List<ChatConversation>> listConversation() {
        return chatConversationRepository.findByUserId("default_user").collectList();
    }

    @Override
    public Mono<List<ChatMessage>> findRecentMessages(String conversationId, int current, int size) {
        if (size <= 0) {
            return Mono.just(new ArrayList<>());
        }
        int offset = Math.max(current, 0) * size;
        int limit = Math.min(size, 999);
        return chatMessageRepository.findRecentMessages(conversationId, offset, limit).collectList();
    }

    @Override
    @Transactional
    public Flux<ServerSentEvent<?>> stream(AgentChatParams params) {
        return chatConversationRepository.findById(params.getConversationId()).flatMapMany(conversation -> {
            LocalDateTime questionTime = LocalDateTime.now();
            String question = params.getQuestion() != null ? params.getQuestion() : "";

//            Agent agent = agentFactory.createAgent(nextContext -> Flux.from(
//                    Flux.mergeSequential(
//                            ollamaRepository.getEmbed(question).flatMap(userEmbedding -> {
//                                ChatMessage questionMessage = ChatMessage.builder()
//                                        .userId("default_user")
//                                        .messageType(ChatMessage.MessageType.TEXT)
//                                        .roleType(ChatMessage.RoleType.USER)
//                                        .content(question)
//                                        .conversationId(conversation.getId())
//                                        .embedding(userEmbedding)
//                                        .createdAt(questionTime)
//                                        .build();
//                                return chatMessageRepository.save(questionMessage);
//                            }),
//                            ollamaRepository.getEmbed(nextContext.getAssistantResponse()).flatMap(embedding -> {
//                                ChatMessage questionMessage = ChatMessage.builder()
//                                        .userId("default_user")
//                                        .messageType(ChatMessage.MessageType.TEXT)
//                                        .roleType(ChatMessage.RoleType.ASSISTANT)
//                                        .content(nextContext.getAssistantResponse())
//                                        .reasoning(nextContext.getAssistantReasoning())
//                                        .conversationId(conversation.getId())
//                                        .embedding(embedding)
//                                        .createdAt(LocalDateTime.now())
//                                        .build();
//                                return chatMessageRepository.save(questionMessage);
//                            })
//                    ).collectList()
//            ).map(savedMessages -> SSEConverter.convert("update_session", savedMessages.getFirst())));

            return agentHandler.handle(null, null, conversation, question).map(response -> {
                return SSEConverter.convert("message", response);
            });
        });
    }
}
