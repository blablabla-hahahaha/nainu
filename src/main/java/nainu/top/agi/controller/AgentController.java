package nainu.top.agi.controller;

import lombok.RequiredArgsConstructor;
import nainu.top.agi.dal.pgsql.model.ChatConversation;
import nainu.top.agi.dal.pgsql.model.ChatMessage;
import nainu.top.agi.model.AgentChatParams;
import nainu.top.agi.model.SaveConversationRequest;
import nainu.top.agi.service.AgentService;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.*;

@RestController
@RequiredArgsConstructor
public class AgentController {

    private final AgentService agentService;

    @GetMapping(value = "/ai/list_message")
    public Mono<List<ChatMessage>> findRecentMessages(String conversationId, int current, int size) {
        return agentService.findRecentMessages(conversationId, current, size);
    }

    @GetMapping(value = "/ai/list_conversation")
    public Mono<List<ChatConversation>> listConversation() {
        return agentService.listConversation();
    }

    @PostMapping(value = "/ai/save_conversation")
    public Mono<ChatConversation> saveConversation(@RequestBody SaveConversationRequest request) {
        return agentService.saveConversation(request);
    }

    @DeleteMapping(value = "/ai/delete_conversation")
    public Mono<Void> deleteConversation(String id) {
        return agentService.deleteConversation(id);
    }

    @DeleteMapping(value = "/ai/clear_conversation")
    public Mono<Void> clearConversation(String id) {
        return agentService.clearConversation(id);
    }

    @PostMapping(value = "/ai/stream_chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<?>> stream (@RequestBody AgentChatParams params) {
        return agentService.stream(params);
    }


}