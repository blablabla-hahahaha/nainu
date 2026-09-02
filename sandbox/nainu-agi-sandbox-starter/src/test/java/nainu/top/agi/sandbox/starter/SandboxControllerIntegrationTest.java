package nainu.top.agi.sandbox.starter;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;

/** 沙箱服务端到端：POST /sandbox/execute 经本地策略执行 python，返回结果写回 JSON。 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SandboxControllerIntegrationTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void runsPythonEndToEnd() {
        webTestClient.post().uri("/sandbox/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("{\"language\":\"python\",\"script\":\"def main():\\n    return {'sum': params['a'] + params['b']}\",\"params\":{\"a\":2,\"b\":3},\"limits\":{\"timeoutMs\":5000},\"workflowId\":\"wf-9\"}")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.result.sum").isEqualTo(5)
                .jsonPath("$.errorCategory").isEmpty();
    }

    @Test
    void rejectsEmptyScriptAsAuthoring() {
        webTestClient.post().uri("/sandbox/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("{\"language\":\"python\",\"script\":\"   \",\"params\":{}}")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.errorCategory").isEqualTo("AUTHORING")
                .jsonPath("$.errorCode").isEqualTo("SANDBOX_EMPTY");
    }
}
