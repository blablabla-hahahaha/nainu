package nainu.top.agi.agent;

import nainu.top.agi.dal.pgsql.model.ChatConversation;
import reactor.core.publisher.Flux;

public interface AgentTool {

    String getName();

    String getDescription();

    String getParameters();

    Flux<AgentMessage> call(ChatConversation root, ChatConversation parent, String arguments);
}
