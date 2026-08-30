package nainu.top.agi.master.executor.debug;

import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.master.executor.NodeExecuteRequest;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * DebugExecutor 输出语义测试：配置了 jsonTemplate 就以模板为输出（模板即输出结构），
 * 未配置时回退到固定演示数据。
 */
class DebugExecutorTest {

    private final DebugExecutor executor = new DebugExecutor();

    @Test
    void returnsTemplateWhenJsonTemplatePresent() {
        Map<String, Object> config = Map.of("jsonTemplate", "{\"result\":\"abc\"}");
        Map<String, Object> result = executor.execute(req(config));
        assertEquals(Map.of("result", "abc"), result);
    }

    @Test
    void returnsTemplateWithEmptyValue() {
        Map<String, Object> config = Map.of("jsonTemplate", "{\"result\":\"\"}");
        Map<String, Object> result = executor.execute(req(config));
        assertEquals(Map.of("result", ""), result);
    }

    @Test
    void returnsEmptyWhenNoTemplate() {
        Map<String, Object> result = executor.execute(req(Map.of()));
        assertTrue(result.isEmpty());
    }

    @Test
    void returnsEmptyWhenTemplateBlank() {
        Map<String, Object> config = Map.of("jsonTemplate", "   ");
        Map<String, Object> result = executor.execute(req(config));
        assertTrue(result.isEmpty());
    }

    private static NodeExecuteRequest req(Map<String, Object> config) {
        return new NodeExecuteRequest("debug", NodeDefinition.NodeType.DEBUG, config, Map.of());
    }
}
