package nainu.top.agi.sandbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** 沙箱语言线上规范名（小写）序列化 / 大小写不敏感反序列化。 */
class SandboxLanguageTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void serializesToLowercaseCode() throws Exception {
        assertEquals("\"python\"", mapper.writeValueAsString(SandboxLanguage.PYTHON));
        assertEquals("\"javascript\"", mapper.writeValueAsString(SandboxLanguage.JAVASCRIPT));
    }

    @Test
    void deserializesCodeCaseInsensitively() throws Exception {
        assertEquals(SandboxLanguage.PYTHON, mapper.readValue("\"python\"", SandboxLanguage.class));
        assertEquals(SandboxLanguage.JAVASCRIPT, mapper.readValue("\"JavaScript\"", SandboxLanguage.class));
    }
}
