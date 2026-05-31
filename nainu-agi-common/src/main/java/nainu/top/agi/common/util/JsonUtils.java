package nainu.top.agi.common.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import nainu.top.agi.common.exception.JsonException;
import org.springframework.util.StringUtils;

import java.util.Objects;
import java.util.concurrent.Callable;

public class JsonUtils {

    private static final ObjectMapper objectMapper = new ObjectMapper();

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
