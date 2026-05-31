package nainu.top.agi.master.controller.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExecuteWorkflowResponse {

    private String workflowId;

    private String dataId;

    private String runId;

    private String status;

    private String message;

    public static ExecuteWorkflowResponse success(String workflowId, String dataId, String runId) {
        return ExecuteWorkflowResponse.builder()
                .workflowId(workflowId)
                .dataId(dataId)
                .runId(runId)
                .status("STARTED")
                .message("工作流执行已启动")
                .build();
    }

    public static ExecuteWorkflowResponse error(String message) {
        return ExecuteWorkflowResponse.builder()
                .status("FAILED")
                .message(message)
                .build();
    }
}
