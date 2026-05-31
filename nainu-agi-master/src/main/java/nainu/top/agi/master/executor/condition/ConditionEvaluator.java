package nainu.top.agi.master.executor.condition;

import nainu.top.agi.common.dsl.ConditionCompareDefinition;
import nainu.top.agi.common.dsl.EdgeConditionDefinition;
import nainu.top.agi.common.dsl.NodeInputFieldDefinition;
import nainu.top.agi.master.workflow.StateKeys;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

/**
 * 条件分支求值器：评估 typed conditional edge 的 {@code condition}。
 *
 * <p>ELSE 恒真；IF/ELIF 按 logicOperator 组合比较项。供编译器生成的条件 router 调用。
 */
@Component
public class ConditionEvaluator {

    /**
     * @return 该条件是否命中
     */
    public boolean evaluate(EdgeConditionDefinition condition, StateReader state) {
        if (condition.getBranchType() == EdgeConditionDefinition.BranchType.ELSE) {
            return true;
        }
        List<ConditionCompareDefinition> compares = condition.getConditions();
        if (compares == null || compares.isEmpty()) {
            return false;
        }
        boolean and = condition.getLogicOperator() != EdgeConditionDefinition.LogicOperator.OR;
        for (ConditionCompareDefinition compare : compares) {
            boolean r = compare(compare, state);
            if (and && !r) {
                return false;
            }
            if (!and && r) {
                return true;
            }
        }
        return and;
    }

    private boolean compare(ConditionCompareDefinition compare, StateReader state) {
        Object actual = resolveField(compare.getField(), state);
        String expected = compare.getValue() == null ? "" : compare.getValue();
        String actualStr = actual == null ? "" : String.valueOf(actual);
        return switch (compare.getOperator()) {
            case EQUALS -> Objects.equals(actualStr, expected);
            case NOT_EQUALS -> !Objects.equals(actualStr, expected);
            case CONTAINS -> actualStr.contains(expected);
            case NOT_CONTAINS -> !actualStr.contains(expected);
            case IS_EMPTY -> actual == null || actualStr.isEmpty();
            case IS_NOT_EMPTY -> actual != null && !actualStr.isEmpty();
        };
    }

    private Object resolveField(NodeInputFieldDefinition field, StateReader state) {
        return switch (field.getType()) {
            case CUSTOM -> field.getValue();
            case INTERNAL_REF -> state.readState(StateKeys.ofRef(field.getValue()));
            case EXTERNAL_REF -> null;
        };
    }

    /**
     * 状态读取抽象：适配器与 router 共用（当前读 OverAllState，B3 可换实现）。
     */
    @FunctionalInterface
    public interface StateReader {
        Object readState(String key);
    }
}
