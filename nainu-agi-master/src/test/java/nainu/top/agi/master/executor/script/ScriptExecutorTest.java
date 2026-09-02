package nainu.top.agi.master.executor.script;

import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.common.exception.ErrorCategory;
import nainu.top.agi.common.exception.WorkflowException;
import nainu.top.agi.master.executor.NodeExecuteRequest;
import nainu.top.agi.sandbox.SandboxErrorCodes;
import nainu.top.agi.sandbox.SandboxExecuteRequest;
import nainu.top.agi.sandbox.SandboxExecuteResponse;
import nainu.top.agi.sandbox.SandboxLanguage;
import nainu.top.agi.sandbox.WorkflowSandboxClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 编码节点：把 config/输入打包为沙箱请求、映射结果、脚本前置 Python 黑名单校验、失败按三件套归类。 */
class ScriptExecutorTest {

    @Test
    void buildsRequestAndMapsResult() {
        WorkflowSandboxClient client = mock(WorkflowSandboxClient.class);
        when(client.execute(any())).thenReturn(CompletableFuture.completedFuture(
                SandboxExecuteResponse.success(Map.of("sum", 5), "", "", 3L)));
        ScriptExecutor executor = new ScriptExecutor(client);

        Map<String, Object> result = executor.execute(new NodeExecuteRequest("n1", NodeDefinition.NodeType.SCRIPT,
                Map.of("language", "python", "script", "def main(): return 0"), Map.of("a", 1)));

        assertEquals(5, result.get("sum"));
        ArgumentCaptor<SandboxExecuteRequest> captor = ArgumentCaptor.forClass(SandboxExecuteRequest.class);
        verify(client).execute(captor.capture());
        assertEquals(SandboxLanguage.PYTHON, captor.getValue().language());
        assertEquals(Map.of("a", 1), captor.getValue().params());
    }

    @Test
    void rejectsPythonDangerousOperationBeforeSend() {
        WorkflowSandboxClient client = mock(WorkflowSandboxClient.class);
        ScriptExecutor executor = new ScriptExecutor(client);

        WorkflowException e = assertThrows(WorkflowException.class, () -> executor.execute(
                new NodeExecuteRequest("n1", NodeDefinition.NodeType.SCRIPT,
                        Map.of("language", "python", "script", "import subprocess\ndef main(): return 1"), Map.of())));

        assertEquals(ErrorCategory.AUTHORING, e.getCategory());
        assertEquals(SandboxErrorCodes.SANDBOX_STATIC_CHECK_FAILED, e.getErrorCode());
        verify(client, never()).execute(any());
    }

    @Test
    void classifiesUnsupportedLanguageAsPlatform() {
        WorkflowSandboxClient client = mock(WorkflowSandboxClient.class);
        ScriptExecutor executor = new ScriptExecutor(client);

        WorkflowException e = assertThrows(WorkflowException.class, () -> executor.execute(
                new NodeExecuteRequest("n1", NodeDefinition.NodeType.SCRIPT,
                        Map.of("language", "ruby", "script", "def main(): pass"), Map.of())));

        assertEquals(ErrorCategory.PLATFORM, e.getCategory());
        assertEquals(SandboxErrorCodes.SANDBOX_UNSUPPORTED_LANGUAGE, e.getErrorCode());
        verify(client, never()).execute(any());
    }

    @Test
    void propagatesSandboxFailureWithCategory() {
        WorkflowSandboxClient client = mock(WorkflowSandboxClient.class);
        when(client.execute(any())).thenReturn(CompletableFuture.completedFuture(
                SandboxExecuteResponse.failure(ErrorCategory.PLATFORM, SandboxErrorCodes.SANDBOX_TIMEOUT, "timeout")));
        ScriptExecutor executor = new ScriptExecutor(client);

        WorkflowException e = assertThrows(WorkflowException.class, () -> executor.execute(
                new NodeExecuteRequest("n1", NodeDefinition.NodeType.SCRIPT,
                        Map.of("language", "python", "script", "def main(): return 1"), Map.of())));

        assertEquals(ErrorCategory.PLATFORM, e.getCategory());
        assertEquals(SandboxErrorCodes.SANDBOX_TIMEOUT, e.getErrorCode());
    }
}
