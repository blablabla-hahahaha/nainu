package nainu.top.agi.dal.llm;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LlmResponse {

    private String id;

    private String reasoning;

    private String content;

    private String callId;

    private String callName;

    private String callArguments;

    private LlmResponseStatus status;

    public enum LlmResponseStatus {
        LOADING,
        DONE
    }
}
