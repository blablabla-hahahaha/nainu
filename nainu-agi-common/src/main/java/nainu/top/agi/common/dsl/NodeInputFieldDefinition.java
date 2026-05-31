package nainu.top.agi.common.dsl;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;

/**
 * 节点输入字段（schema 窄通道的节点间通道）。
 */
@Data
@NoArgsConstructor
public class NodeInputFieldDefinition {

    private String key;

    private FieldType type;

    /**
     * INTERNAL_REF 时为 {@code nodeId:key} 引用；CUSTOM 时为字面量真实值。
     */
    private String value;

    @RequiredArgsConstructor
    public enum FieldType {
        /**
         * 内部引用：引用前置节点某输出字段，值格式 {@code nodeId:key}
         */
        INTERNAL_REF,
        /**
         * 自定义：值即真实字面量
         */
        CUSTOM,
        /**
         * 外部引用：引用外部输入的值（预留）
         */
        EXTERNAL_REF;
    }
}
