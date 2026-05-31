package nainu.top.agi.common.dsl;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;

import java.util.List;

/**
 * 条件分支定义（typed conditional edge 的载荷）。
 *
 * <p>ELSE 分支只有 {@code branchType}，禁止携带表达式；IF / ELIF 必须携带
 * {@code logicOperator} 与 {@code conditions}。此约束由图校验器强制。
 */
@Data
@NoArgsConstructor
public class EdgeConditionDefinition {

    private BranchType branchType;

    private LogicOperator logicOperator;

    private List<ConditionCompareDefinition> conditions;

    @RequiredArgsConstructor
    public enum BranchType {
        IF,
        ELIF,
        ELSE;
    }

    @RequiredArgsConstructor
    public enum LogicOperator {
        AND,
        OR;
    }
}
