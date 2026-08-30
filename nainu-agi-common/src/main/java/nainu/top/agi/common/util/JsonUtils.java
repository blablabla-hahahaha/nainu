package nainu.top.agi.common.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import nainu.top.agi.common.exception.JsonException;
import org.springframework.util.StringUtils;

import java.util.Objects;
import java.util.concurrent.Callable;

/**
 * JSON 工具：统一 ObjectMapper，序列化/反序列化共用。
 *
 * <p>反序列化开启 {@code FAIL_ON_TRAILING_TOKENS}：值后面的多余字符（如 `{}身份`）视为非法并抛
 * {@link JsonException}（大声失败），与前端严格 {@code JSON.parse} 一致，避免「看起来该报错却静默成功」。
 */
public class JsonUtils {

    private static final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_TRAILING_TOKENS, true);

    public static String toJson(Object value) {
        return tryJson(() -> objectMapper.writeValueAsString(value), "Failed to serialize to JSON");
    }

    public static <T> T fromJson(String json, Class<T> clazz) {
        if (!StringUtils.hasText(json)) {
            return null;
        }
        return tryJson(() -> objectMapper.readValue(json, clazz), "Failed to deserialize from JSON");
    }

    public static <T> T fromJson(String json, TypeReference<T> typeReference) {
        if (!StringUtils.hasText(json)) {
            return null;
        }
        return tryJson(() -> objectMapper.readValue(json, typeReference), "Failed to deserialize from JSON");
    }

    public static <T> T convert(Object source, TypeReference<T> targetTypeReference) {
        if (Objects.isNull(source)) {
            return null;
        }
        String json = toJson(source);
        return fromJson(json, targetTypeReference);
    }

    private static <T> T tryJson(Callable<T> action, String errorMsg) {
        try {
            return action.call();
        } catch (Exception e) {
            throw new JsonException(errorMsg, e);
        }
    }
}
