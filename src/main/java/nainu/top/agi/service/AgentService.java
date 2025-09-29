package nainu.top.agi.service;

import nainu.top.agi.dal.pgsql.model.ChatConversation;
import nainu.top.agi.dal.pgsql.model.ChatMessage;
import nainu.top.agi.model.AgentChatParams;
import nainu.top.agi.model.SaveConversationRequest;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

public interface AgentService {

    /**
     * 获取最近消息
     * @param conversationId    会话ID
     * @param current           当前页
     * @param size              页大小
     * @return                  消息流
     */
    Mono<List<ChatMessage>> findRecentMessages(String conversationId, int current, int size);

    /**
     * 获取会话列表
     * @return      会话列表
     */
    Mono<List<ChatConversation>> listConversation();

    /**
     * 创建会话
     * @return      会话
     */
    Mono<ChatConversation> saveConversation(SaveConversationRequest request);

    /**
     * 删除会话
     * @param id    会话ID
     * @return      无
     */
    Mono<Void> deleteConversation(String id);

    /**
     * 清空会话
     * @param id    会话ID
     * @return      无
     */
    Mono<Void> clearConversation(String id);

    /**
     * 聊天
     * @param params    聊天参数
     * @return          聊天结果
     */
    Flux<ServerSentEvent<?>> stream (AgentChatParams params);
}
