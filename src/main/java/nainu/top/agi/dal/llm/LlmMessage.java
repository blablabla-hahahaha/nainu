package nainu.top.agi.dal.llm;

import lombok.Builder;
import lombok.Getter;
import nainu.top.agi.dal.pgsql.model.ChatMessage;

import java.util.Optional;

@Getter
@Builder
public class LlmMessage {

    private String content;
    private String reasoning;
    private String toolCallId;
    private String toolCallName;
    private String toolCallArguments;
    private ChatMessage.RoleType roleType;

    private String append(String left, String right) {
        return Optional.ofNullable(left).orElse("") + Optional.ofNullable(right).orElse("");
    }

    public void appendContent(String content) {
        this.content = append(this.content, content);
    }

    public void appendReasoning(String reasoning) {
        this.reasoning = append(this.reasoning, reasoning);
    }

    public void appendToolCallId(String toolCallId) {
        this.toolCallId = append(this.toolCallId, toolCallId);
    }

    public void appendToolCallArguments(String toolCallArguments) {
        this.toolCallArguments = append(this.toolCallArguments, toolCallArguments);
    }

    public void appendToolCallName(String toolCallName) {
        this.toolCallName = append(this.toolCallName, toolCallName);
    }

    public static LlmMessage buildSystemMessage(String content) {
        return LlmMessage.builder()
                .content(content)
                .roleType(ChatMessage.RoleType.SYSTEM)
                .build();
    }

    public static LlmMessage buildUserMessage(String question) {
        return LlmMessage.builder()
                .content(question)
                .roleType(ChatMessage.RoleType.USER)
                .build();
    }

    public static LlmMessage buildToolMessage(StringBuilder toolResponse, String toolCallId) {
        return LlmMessage.builder()
                .content(toolResponse.toString())
                .toolCallId(toolCallId)
                .roleType(ChatMessage.RoleType.TOOL)
                .build();
    }
}
