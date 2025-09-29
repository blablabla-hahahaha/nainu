package nainu.top.agi.model;

import lombok.Getter;
import lombok.Setter;

/**
 * 聊天请求参数类
 */
@Getter
@Setter
public class ChatRequestParams {
    private String prompt;

    private String system;

    private String model = "deepseek-chat";

    private Double temperature = 0.7;

    private Double topP = 1.0;

    private Integer maxTokens = 1024;

    private Double repetitionPenalty = 1.0;

    private Double frequencyPenalty = 0.0;

    private Double presencePenalty = 0.0;

    private String responseFormat = "text";
}