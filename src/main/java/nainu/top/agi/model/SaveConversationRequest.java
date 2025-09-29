package nainu.top.agi.model;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SaveConversationRequest {
    private String id;
    private String title;
    private String description;
    private JsonNode config;
}
