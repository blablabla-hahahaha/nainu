package nainu.top.agi.sandbox.local;

import nainu.top.agi.common.exception.ErrorCategory;
import nainu.top.agi.sandbox.SandboxErrorCodes;
import nainu.top.agi.sandbox.SandboxExecuteRequest;
import nainu.top.agi.sandbox.SandboxExecuteResponse;
import nainu.top.agi.sandbox.SandboxLanguage;
import nainu.top.agi.sandbox.SandboxLimits;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** 本地策略：全新子解释器执行 python / JavaScript，无跨执行残留，错误按三件套归类。 */
class LocalSandboxStrategyTest {

    private final LocalSandboxStrategy strategy = new LocalSandboxStrategy();

    @Test
    void runsPythonWithParams() {
        SandboxExecuteResponse resp = strategy.execute(SandboxExecuteRequest.of(SandboxLanguage.PYTHON,
                "def main():\n    return {'sum': params['a'] + params['b']}", Map.of("a", 2, "b", 3)));
        assertTrue(resp.success());
        assertEquals(5, resp.result().get("sum"));
    }

    @Test
    void runsJavaScriptWithParams() {
        SandboxExecuteResponse resp = strategy.execute(SandboxExecuteRequest.of(SandboxLanguage.JAVASCRIPT,
                "function main() { return { sum: params.a + params.b }; }", Map.of("a", 2, "b", 4)));
        assertTrue(resp.success());
        assertEquals(6, resp.result().get("sum"));
    }

    @Test
    void noStateCarriesAcrossExecutions() {
        strategy.execute(SandboxExecuteRequest.of(SandboxLanguage.PYTHON,
                "a = 123\ndef main():\n    return {'ok': True}", Map.of()));
        SandboxExecuteResponse resp = strategy.execute(SandboxExecuteRequest.of(SandboxLanguage.PYTHON,
                "def main():\n    return {'a_seen': 'a' in globals()}", Map.of()));
        assertTrue(resp.success());
        assertEquals(false, resp.result().get("a_seen"));
    }

    @Test
    void classifiesScriptRuntimeErrorAsAuthoring() {
        SandboxExecuteResponse resp = strategy.execute(SandboxExecuteRequest.of(SandboxLanguage.PYTHON,
                "def main():\n    return 1/0", Map.of()));
        assertFalse(resp.success());
        assertEquals(ErrorCategory.AUTHORING, resp.errorCategory());
        assertEquals(SandboxErrorCodes.SANDBOX_EXECUTION_FAILED, resp.errorCode());
    }

    @Test
    void classifiesTimeoutAsPlatform() {
        SandboxExecuteResponse resp = strategy.execute(new SandboxExecuteRequest(SandboxLanguage.PYTHON,
                "def main():\n    import time\n    time.sleep(5)\n    return {}", Map.of(), new SandboxLimits(200L, 256L, 1_000_000L), null, null, null));
        assertFalse(resp.success());
        assertEquals(ErrorCategory.PLATFORM, resp.errorCategory());
        assertEquals(SandboxErrorCodes.SANDBOX_TIMEOUT, resp.errorCode());
    }

    @Test
    void classifiesMissingLanguageAsPlatform() {
        SandboxExecuteResponse resp = strategy.execute(new SandboxExecuteRequest(null, "def main(): pass", Map.of(), null, null, null, null));
        assertFalse(resp.success());
        assertEquals(ErrorCategory.PLATFORM, resp.errorCategory());
        assertEquals(SandboxErrorCodes.SANDBOX_UNSUPPORTED_LANGUAGE, resp.errorCode());
    }
}
