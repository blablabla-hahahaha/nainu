package nainu.top.agi.master.executor.debug;

import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.common.exception.ErrorCategory;
import nainu.top.agi.common.exception.ErrorCodes;
import nainu.top.agi.common.exception.WorkflowException;
import nainu.top.agi.master.executor.NodeExecuteRequest;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
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

    /** 模板对象后带多余字符（trailing token）：应视为用户配置错误（AUTHORING），不得静默忽略。 */
    @Test
    void throwsAuthoringWhenTemplateHasTrailingJunk() {
        Map<String, Object> config = Map.of("jsonTemplate", "{\"result_username\":\"张三0\",\"result_age\":10}的身份");
        WorkflowException ex = assertThrows(WorkflowException.class, () -> executor.execute(req(config)));
        assertEquals(ErrorCategory.AUTHORING, ex.getCategory());
    }

    @Test
    void returnsEmptyWhenTemplateBlank() {
        Map<String, Object> config = Map.of("jsonTemplate", "   ");
        Map<String, Object> result = executor.execute(req(config));
        assertTrue(result.isEmpty());
    }

    /** 配置了 jsonTemplate 但非法：用户的配置错误，AUTHORING + 稳定错误码，不再静默降级为空输出。 */
    @Test
    void throwsAuthoringWhenJsonTemplateInvalid() {
        Map<String, Object> config = Map.of("jsonTemplate", "{\"a\":\"1i\"230}地方");
        WorkflowException ex = assertThrows(WorkflowException.class, () -> executor.execute(req(config)));
        assertEquals(ErrorCategory.AUTHORING, ex.getCategory());
        assertEquals(ErrorCodes.JSON_TEMPLATE_INVALID, ex.getErrorCode());
        assertFalse(ex.isRetryable());
    }

    /** jsonTemplate 是合法 JSON 但非对象（null/数组/原始值）：AUTHORING + NOT_OBJECT。 */
    @Test
    void throwsAuthoringWhenJsonTemplateNotObject() {
        Map<String, Object> config = Map.of("jsonTemplate", "null");
        WorkflowException ex = assertThrows(WorkflowException.class, () -> executor.execute(req(config)));
        assertEquals(ErrorCategory.AUTHORING, ex.getCategory());
        assertEquals(ErrorCodes.JSON_TEMPLATE_NOT_OBJECT, ex.getErrorCode());
    }

    /** 无 WorkflowException 的异常默认 PLATFORM；resolve 沿 cause 链命中 WorkflowException。 */
    @Test
    void resolvesCategoryFromChainWithPlatformDefault() {
        assertEquals(ErrorCategory.PLATFORM, WorkflowException.resolveCategory(new IllegalStateException("x")));
        assertNull(WorkflowException.resolveErrorCode(new IllegalStateException("x")));
        assertFalse(WorkflowException.resolveRetryable(new IllegalStateException("x")));

        Throwable wrapped = new RuntimeException(new IllegalStateException(new WorkflowException(
                ErrorCategory.EXTERNAL, ErrorCodes.CONDITION_NO_MATCH, "upstream", true)));
        assertEquals(ErrorCategory.EXTERNAL, WorkflowException.resolveCategory(wrapped));
        assertEquals(ErrorCodes.CONDITION_NO_MATCH, WorkflowException.resolveErrorCode(wrapped));
        assertTrue(WorkflowException.resolveRetryable(wrapped));
    }

    /** resolveDetail：只取最内层 cause 的关键 message；无底层原因时为 null；去掉类名与 Source 噪音。 */
    @Test
    void resolvesDetailFromCauseChain() {
        WorkflowException withCause = new WorkflowException(ErrorCategory.AUTHORING, ErrorCodes.JSON_TEMPLATE_INVALID,
                "用户文案", false, new RuntimeException("底层原因"));
        assertEquals("底层原因", WorkflowException.resolveDetail(withCause));

        WorkflowException withSource = new WorkflowException(ErrorCategory.AUTHORING, ErrorCodes.JSON_TEMPLATE_INVALID,
                "用户文案", false,
                new RuntimeException("Unrecognized token '地方张三' at [Source: (stream)#REDACTED]: line: 1, column: 51"));
        String detail = WorkflowException.resolveDetail(withSource);
        assertEquals("Unrecognized token '地方张三'", detail);
        assertFalse(detail.contains("at ["));
        assertFalse(detail.contains("JsonException"));

        WorkflowException rootless = new WorkflowException(ErrorCategory.AUTHORING, ErrorCodes.DSL_INVALID, "无底层");
        assertNull(WorkflowException.resolveDetail(rootless));
    }

    /** 非法模板抛出的异常携带精简技术详情（无类名、无 Source 位置噪音）。 */
    @Test
    void invalidTemplateCarriesTechnicalDetail() {
        WorkflowException ex = assertThrows(WorkflowException.class,
                () -> executor.execute(req(Map.of("jsonTemplate", "{\"a\":\"1i\"230}地方"))));
        String detail = WorkflowException.resolveDetail(ex);
        assertTrue(detail != null && !detail.isBlank());
        assertFalse(detail.contains("JsonException"));
        assertFalse(detail.contains("at ["));
    }

    private static NodeExecuteRequest req(Map<String, Object> config) {
        return new NodeExecuteRequest("debug", NodeDefinition.NodeType.DEBUG, config, Map.of());
    }
}
