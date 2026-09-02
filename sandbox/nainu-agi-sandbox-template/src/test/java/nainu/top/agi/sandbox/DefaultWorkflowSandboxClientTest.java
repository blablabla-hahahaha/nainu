package nainu.top.agi.sandbox;

import com.sun.net.httpserver.HttpServer;
import nainu.top.agi.common.exception.ErrorCategory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** 客户端门面经真实 HTTP 往返：正常响应解析 + 非 2xx 收敛为 PLATFORM。 */
class DefaultWorkflowSandboxClientTest {

    private HttpServer server;

    private DefaultWorkflowSandboxClient client;

    @BeforeEach
    void setUp() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.start();
        client = new DefaultWorkflowSandboxClient("http://127.0.0.1:" + server.getAddress().getPort());
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    @Test
    void postsAndParsesSuccessResponse() throws Exception {
        server.createContext("/sandbox/execute", exchange -> {
            byte[] body = ("{\"result\":{\"sum\":5},\"stdout\":\"\",\"stderr\":null,\"errorCategory\":null,"
                    + "\"errorCode\":null,\"detail\":null,\"durationMs\":3}").getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });

        SandboxExecuteResponse resp = client.execute(
                SandboxExecuteRequest.of(SandboxLanguage.PYTHON, "def main(): return {}", Map.of())).join();

        assertTrue(resp.success());
        assertEquals(5, resp.result().get("sum"));
    }

    @Test
    void mapsNon2xxToPlatformError() throws Exception {
        server.createContext("/sandbox/execute", exchange -> {
            byte[] body = "boom".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(500, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });

        SandboxExecuteResponse resp = client.execute(
                SandboxExecuteRequest.of(SandboxLanguage.PYTHON, "def main(): return {}", Map.of())).join();

        assertFalse(resp.success());
        assertEquals(ErrorCategory.PLATFORM, resp.errorCategory());
        assertEquals(SandboxErrorCodes.SANDBOX_INTERNAL, resp.errorCode());
    }
}
