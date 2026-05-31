package nainu.top.agi.common.dsl;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 边定义（canonical DSL）。
 *
 * <p>条件路由以 typed conditional edge 表示：{@code condition} 非空即为条件分支边，
 * 求值按边数组序（CONDITION 节点出边中 ELSE 必须为最后一条）。
 */
@Data
@NoArgsConstructor
public class EdgeDefinition {

    private String id;

    private String source;

    private String target;

    /**
     * 多出向连接点标识；条件分支边用它区分分支。
     */
    private String sourceHandle;

    private EdgeConditionDefinition condition;
}
