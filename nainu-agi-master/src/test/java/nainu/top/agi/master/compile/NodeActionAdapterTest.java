package nainu.top.agi.master.compile;

import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.common.dsl.NodeOutputFieldDefinition;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 节点对外可见输出（trace 快照）映射测试：执行器原始结果按 {@code node.output} 声明的 key→keyAlias
 * 投影为别名键。visibleOutput 为纯映射函数，不依赖注入的 executor / traceEmitter，故以 null 构造。
 */
class NodeActionAdapterTest {

    /** 原始结果先按声明映射成别名键；keyAlias 非空用别名，为空落回 key。 */
    @Test
    void mapsRawResultToAliasKeys() {
        NodeDefinition def = nodeWithOutput(
                output("result_username", "username"),
                output("result_age", "age"));
        NodeActionAdapter adapter = new NodeActionAdapter(def, null, null);

        Map<String, Object> visible = adapter.visibleOutput(Map.of(
                "result_username", "张三0",
                "result_age", 10));

        assertEquals(Map.of("username", "张三0", "age", 10), visible);
    }

    /** keyAlias 为空时落回 key（与写回图状态的引用名一致）。 */
    @Test
    void fallsBackToKeyWhenAliasEmpty() {
        NodeDefinition def = nodeWithOutput(output("result", null));
        NodeActionAdapter adapter = new NodeActionAdapter(def, null, null);

        Map<String, Object> visible = adapter.visibleOutput(Map.of("result", "x"));

        assertEquals(Map.of("result", "x"), visible);
    }

    /** 原始结果里未声明为输出的 key 不属于节点输出，被丢弃。 */
    @Test
    void dropsUndeclaredKeys() {
        NodeDefinition def = nodeWithOutput(output("result_username", "username"));
        NodeActionAdapter adapter = new NodeActionAdapter(def, null, null);

        Map<String, Object> visible = adapter.visibleOutput(Map.of(
                "result_username", "张三0",
                "internal_detail", 42));

        assertEquals(Map.of("username", "张三0"), visible);
        assertTrue(adapter.visibleOutput(null).isEmpty());
    }

    private static NodeDefinition nodeWithOutput(NodeOutputFieldDefinition... outputs) {
        NodeDefinition def = new NodeDefinition();
        def.setId("n1");
        def.setType(NodeDefinition.NodeType.DEBUG);
        def.setOutput(List.of(outputs));
        return def;
    }

    private static NodeOutputFieldDefinition output(String key, String alias) {
        NodeOutputFieldDefinition o = new NodeOutputFieldDefinition();
        o.setKey(key);
        o.setKeyAlias(alias);
        return o;
    }
}
