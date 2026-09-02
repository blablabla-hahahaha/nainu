package nainu.top.agi.sandbox.starter;

import nainu.top.agi.common.exception.ErrorCategory;
import nainu.top.agi.sandbox.SandboxErrorCodes;
import nainu.top.agi.sandbox.SandboxExecuteRequest;
import nainu.top.agi.sandbox.SandboxExecuteResponse;
import nainu.top.agi.sandbox.SandboxLanguage;
import nainu.top.agi.sandbox.SandboxStrategy;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Duration;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** 沙箱服务：空脚本拦截、委托策略、会话绑定。 */
class SandboxServiceTest {

    private static final SandboxStrategy OK_STRATEGY = new SandboxStrategy() {
        @Override
        public String type() {
            return "test";
        }

        @Override
        public SandboxExecuteResponse execute(SandboxExecuteRequest request) {
            return SandboxExecuteResponse.success(Map.of("echo", request.script()), "", "", 1L);
        }
    };

    @Test
    void rejectsEmptyScriptAsAuthoring() {
        SandboxService service = new SandboxService(provider(OK_STRATEGY), new SandboxSessionStore(Duration.ofMinutes(30)));
        SandboxExecuteResponse resp = service.execute(SandboxExecuteRequest.of(SandboxLanguage.PYTHON, "   ", Map.of()));
        assertFalse(resp.success());
        assertEquals(ErrorCategory.AUTHORING, resp.errorCategory());
        assertEquals(SandboxErrorCodes.SANDBOX_EMPTY, resp.errorCode());
    }

    @Test
    void delegatesToStrategyAndBindsSession() {
        SandboxSessionStore store = new SandboxSessionStore(Duration.ofMinutes(30));
        SandboxService service = new SandboxService(provider(OK_STRATEGY), store);
        SandboxExecuteResponse resp = service.execute(
                new SandboxExecuteRequest(SandboxLanguage.PYTHON, "def main(): return {}", Map.of(), null, null, "wf-1", "n1"));
        assertTrue(resp.success());
        assertEquals("wf-1", store.get("wf-1").workflowId());
    }

    private static ObjectProvider<SandboxStrategy> provider(SandboxStrategy strategy) {
        return new ObjectProvider<>() {
            @Override
            public SandboxStrategy getObject() {
                return strategy;
            }
        };
    }
}
