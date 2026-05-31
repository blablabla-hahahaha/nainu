package nainu.top.agi.master.workflow;

import com.alibaba.cloud.ai.graph.CompiledGraph;
import lombok.Getter;
import reactor.core.Disposable;
import reactor.core.publisher.Sinks;

import java.util.Map;

/**
 * 单次执行会话：runId（= threadId）+ 编译产物 + 实时事件通道 + 生命周期。
 */
@Getter
public class RunSession {

    private final String runId;

    private final CompiledGraph graph;

    private final Sinks.Many<Map<String, Object>> sink;

    private volatile Disposable disposable;

    private volatile String status = "RUNNING";

    private volatile String interruptedNode;

    public RunSession(String runId, CompiledGraph graph, Sinks.Many<Map<String, Object>> sink) {
        this.runId = runId;
        this.graph = graph;
        this.sink = sink;
    }

    public void setDisposable(Disposable disposable) {
        this.disposable = disposable;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setInterruptedNode(String interruptedNode) {
        this.interruptedNode = interruptedNode;
    }
}
