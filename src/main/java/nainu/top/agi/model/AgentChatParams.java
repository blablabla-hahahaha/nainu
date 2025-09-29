package nainu.top.agi.model;

import lombok.Getter;
import lombok.Setter;

/**
 * 聊天请求参数类
 */
@Getter
@Setter
public class AgentChatParams {

    private String role;
    private String question;
    private String conversationId;
}