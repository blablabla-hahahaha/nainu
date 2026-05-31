package nainu.top.agi.common.dsl;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 节点输出字段：{@code key} 为执行器结果字段名，{@code keyAlias} 为对外引用名
 * （为空时使用 key）。
 */
@Data
@NoArgsConstructor
public class NodeOutputFieldDefinition {

    private String key;

    private String keyAlias;
}
