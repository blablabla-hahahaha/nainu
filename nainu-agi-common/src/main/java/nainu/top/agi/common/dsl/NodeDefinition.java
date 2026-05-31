package nainu.top.agi.common.dsl;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 节点定义（canonical DSL）。
 *
 * <p>{@code config} 为节点参数（自由对象，结构由各节点类型的 per-type schema 约束）；
 * {@code input} / {@code output} 为字段级引用声明（schema 窄通道）。
 */
@Data
@NoArgsConstructor
public class NodeDefinition {

    private String id;

    private NodeType type;

    private Map<String, Object> config;

    private List<NodeInputFieldDefinition> input;

    private List<NodeOutputFieldDefinition> output;

    @RequiredArgsConstructor
    public enum NodeType {
        /**
         * 开始节点：工作流必须且只能有一个
         */
        START,
        /**
         * 结束节点
         */
        END,
        /**
         * 条件节点：条件路由经其出边的 {@code condition} 表达（typed conditional edge）
         */
        CONDITION,
        /**
         * 调试节点：返回固定演示数据
         */
        DEBUG,
        /**
         * 脚本节点：GraalVM 沙箱内执行（params 注入 + main() 约定）
         */
        SCRIPT;
    }
}
