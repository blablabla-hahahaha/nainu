package nainu.top.agi.common.dsl;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;

/**
 * 条件比较项：字段引用 × 比较操作符 × 字面量。
 */
@Data
@NoArgsConstructor
public class ConditionCompareDefinition {

    private NodeInputFieldDefinition field;

    private CompareOperator operator;

    private String value;

    @RequiredArgsConstructor
    public enum CompareOperator {
        EQUALS,
        NOT_EQUALS,
        CONTAINS,
        NOT_CONTAINS,
        IS_EMPTY,
        IS_NOT_EMPTY;
    }
}
