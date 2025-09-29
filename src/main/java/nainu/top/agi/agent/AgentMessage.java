package nainu.top.agi.agent;

import lombok.Builder;
import lombok.Getter;
import nainu.top.agi.dal.llm.LlmResponse;

@Getter
@Builder
public class AgentMessage {

    private String id;

    private String title;

    private String conversationId;

    private String rootConversationId;

    private String parentConversationId;

    private String reasoning;

    private String content;

    private LlmResponse.LlmResponseStatus status;
}
