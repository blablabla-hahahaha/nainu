package nainu.top.agi.dal.pgsql.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

@Data
@Builder
@Table("agent.chat_conversation")
public class ChatConversation {
    @Id
    private String id;
    private String userId;
    private String title;
    private String description;
    @Column("config")
    private JsonNode config;
    private String functionName;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}

