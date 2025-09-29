package nainu.top.agi.dal.pgsql;

import nainu.top.agi.dal.pgsql.model.ChatConversation;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

public interface ChatConversationRepository extends ReactiveCrudRepository<ChatConversation, String> {

    @Query("SELECT * FROM agent.chat_conversation WHERE user_id = :userId ORDER BY created_at DESC")
    Flux<ChatConversation> findByUserId(String userId);

    @Query("SELECT * FROM agent.chat_conversation WHERE id IN (:ids)")
    Flux<ChatConversation> findByIds(List<String> ids);
}
