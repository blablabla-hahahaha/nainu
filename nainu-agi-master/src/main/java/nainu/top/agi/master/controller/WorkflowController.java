package nainu.top.agi.master.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nainu.top.agi.master.controller.request.ExecuteWorkflowRequest;
import nainu.top.agi.master.controller.response.ExecuteWorkflowResponse;
import nainu.top.agi.master.workflow.WorkflowRunService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

/**
 * 工作流执行 API：execute 返回 runId（异步执行），事件经 SSE 实时跟随、经 events 历史重放。
 */
@Slf4j
@RestController
@RequestMapping("/api/workflow")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowRunService workflowRunService;

    @PostMapping("/execute")
    public Mono<ResponseEntity<ExecuteWorkflowResponse>> executeWorkflow(@RequestBody ExecuteWorkflowRequest request) {
        log.info("收到工作流执行请求，workflowId: {}, dataId: {}", request.getWorkflowId(), request.getDataId());

        if (request.getGraphDefinition() == null) {
            return Mono.just(ResponseEntity.badRequest()
                    .body(ExecuteWorkflowResponse.error("工作流定义不能为空")));
        }

        String runId = WorkflowRunService.newRunId();
        return workflowRunService.execute(request.getGraphDefinition(), request.getInputParams(), runId)
                .map(id -> ResponseEntity.ok(ExecuteWorkflowResponse.success(
                        request.getGraphDefinition().getId(), request.getDataId(), id)))
                .onErrorResume(e -> {
                    log.error("工作流执行启动失败", e);
                    return Mono.just(ResponseEntity.internalServerError()
                            .body(ExecuteWorkflowResponse.error(e.getMessage())));
                });
    }

    /**
     * SSE 事件流：断线经 {@code Last-Event-ID} 续传（事件 id = seq）。
     */
    @GetMapping(value = "/{runId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Map<String, Object>>> stream(
            @PathVariable String runId,
            @RequestHeader(value = "Last-Event-ID", required = false) String lastEventId) {
        return workflowRunService.streamEvents(runId, lastEventId);
    }

    /**
     * 历史事件（replay 模式）。
     */
    @GetMapping("/{runId}/events")
    public Mono<ResponseEntity<List<Map<String, Object>>>> events(@PathVariable String runId) {
        return workflowRunService.events(runId)
                .collectList()
                .map(ResponseEntity::ok)
                .onErrorResume(e -> {
                    log.error("读取事件历史失败 runId={}", runId, e);
                    return Mono.just(ResponseEntity.badRequest().build());
                });
    }

    /**
     * 用户暂停（graph-core 取消语义，at-least-once）。
     */
    @PostMapping("/{runId}/pause")
    public Mono<ResponseEntity<ExecuteWorkflowResponse>> pause(@PathVariable String runId) {
        return workflowRunService.pause(runId)
                .thenReturn(ResponseEntity.ok(ExecuteWorkflowResponse.success(null, null, runId)))
                .onErrorResume(e -> {
                    log.error("暂停失败 runId={}", runId, e);
                    return Mono.just(ResponseEntity.internalServerError()
                            .body(ExecuteWorkflowResponse.error(e.getMessage())));
                });
    }

    /**
     * 恢复：body 可携带 HITL 中断的人工输入（{@code {key: value}}）。
     */
    @PostMapping("/{runId}/resume")
    public Mono<ResponseEntity<ExecuteWorkflowResponse>> resume(
            @PathVariable String runId,
            @RequestBody(required = false) Map<String, Object> interruptInput) {
        return workflowRunService.resume(runId, interruptInput)
                .thenReturn(ResponseEntity.ok(ExecuteWorkflowResponse.success(null, null, runId)))
                .onErrorResume(e -> {
                    log.error("恢复失败 runId={}", runId, e);
                    return Mono.just(ResponseEntity.internalServerError()
                            .body(ExecuteWorkflowResponse.error(e.getMessage())));
                });
    }
}
