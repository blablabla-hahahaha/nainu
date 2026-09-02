package nainu.top.agi.sandbox.starter;

import nainu.top.agi.sandbox.SandboxExecuteRequest;
import nainu.top.agi.sandbox.SandboxExecuteResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * 沙箱执行 API。
 *
 * <p>{@code POST /sandbox/execute}：执行一段脚本并返回结果。本地策略含阻塞子进程，故在
 * {@code boundedElastic} 上执行，不在事件循环线程阻塞（WebFlux 纪律）。
 */
@RestController
public class SandboxController {

    private final SandboxService service;

    public SandboxController(SandboxService service) {
        this.service = service;
    }

    @PostMapping(path = "/sandbox/execute", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<SandboxExecuteResponse> execute(@RequestBody SandboxExecuteRequest request) {
        return Mono.fromCallable(() -> service.execute(request))
                .subscribeOn(Schedulers.boundedElastic());
    }
}
