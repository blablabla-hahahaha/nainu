package nainu.top.agi.dal.pgsql;

import nainu.top.agi.dal.pgsql.model.ChatMessage;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

public interface ChatMessageRepository extends ReactiveCrudRepository<ChatMessage, String> {

    /**
     * 查询最近的5条聊天记录，按创建时间倒序排列
     * @return 最近的聊天记录流
     */
    @Query("""
        SELECT
            *
        FROM agent.chat_messages
        WHERE conversation_id = :conversationId
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """)
    Flux<ChatMessage> findRecentMessages(String conversationId, int offset, int limit);

    @Query("DELETE FROM agent.chat_messages WHERE conversation_id = :id")
    Mono<Void> deleteByConversationId(String id);

    default Mono<List<ChatMessage>> saveBatch(List<ChatMessage> messages) {
        return this.saveAll(messages).collectList();
    }
}
