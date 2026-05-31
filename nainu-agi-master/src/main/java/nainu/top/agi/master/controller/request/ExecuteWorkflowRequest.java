package nainu.top.agi.master.controller.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import nainu.top.agi.common.dsl.GraphDefinition;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExecuteWorkflowRequest {

    private String workflowId;

    private String dataId;

    private GraphDefinition graphDefinition;

    private Map<String, Object> inputParams;
}
