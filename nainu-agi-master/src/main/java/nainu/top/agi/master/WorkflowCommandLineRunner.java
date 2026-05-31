package nainu.top.agi.master;

import lombok.RequiredArgsConstructor;
import nainu.top.agi.common.dsl.GraphDefinition;
import nainu.top.agi.common.util.JsonUtils;
import nainu.top.agi.master.workflow.WorkflowRunService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.Map;

/**
 * 启动演示：加载 workflow-demo.json，走 graph-core 编译执行并打印节点输出。
 */
@Component
@RequiredArgsConstructor
public class WorkflowCommandLineRunner implements CommandLineRunner {

    private final WorkflowRunService workflowRunService;

    @Override
    public void run(String... args) {
        System.out.println("========== 工作流演示 ==========");

        String json;
        try (InputStream is = new ClassPathResource("workflow-demo.json").getInputStream()) {
            json = new String(is.readAllBytes());
        } catch (Exception e) {
            throw new IllegalStateException("读取 workflow-demo.json 失败", e);
        }
        GraphDefinition graph = JsonUtils.fromJson(json, GraphDefinition.class);
        System.out.println("工作流: " + graph.getName() + "  节点: " + graph.getNodes().size()
                + "  边: " + graph.getEdges().size());

        System.out.println("\n启动执行...");
        workflowRunService.stream(graph, Map.of(), WorkflowRunService.newRunId())
                .doOnNext(output -> {
                    if (output.isEND()) {
                        return;
                    }
                    System.out.println("节点 " + output.node() + " 完成，状态键: " + output.state().data().keySet());
                })
                .doOnComplete(() -> {
                    System.out.println("\n✅ 执行完成");
                    System.out.println("========== 演示结束 ==========");
                })
                .doOnError(error -> {
                    System.err.println("\n❌ 执行失败: " + error.getMessage());
                    System.out.println("========== 演示结束 ==========");
                })
                .blockLast();
    }
}
