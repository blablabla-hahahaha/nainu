package nainu.top.agi.common.dsl;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 工作流定义（canonical DSL：nodes + edges）。
 *
 * <p>本类是 {@code workflow-dsl.schema.json} 的 Java 投影；结构以 schema 为唯一权威。
 */
@Data
@NoArgsConstructor
public class GraphDefinition {

    private String id;

    private String name;

    /**
     * 乐观锁：保存时 +1，可空（兼容未版本化的工作流）。
     */
    private Integer version;

    private Map<String, Object> meta;

    private List<NodeDefinition> nodes;

    private List<EdgeDefinition> edges;
}
