package nainu.top.agi.dal.pgsql.model;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

@Data
@Builder
@Table("agent.chat_messages")
public class ChatMessage {
    @Id
    private String id;
    private String userId;
    private String conversationId;
    private MessageType messageType;
    private RoleType roleType;
    private String content;
    private String reasoning;
    private float[] embedding;
    private LocalDateTime createdAt;

    public enum MessageType {
        TEXT, IMAGE, FILE, SYSTEM
    }
    public enum RoleType {
        USER, ASSISTANT, SYSTEM, TOOL
    }
}
