package nainu.top.agi.common.exception;

/**
 * JSON 解析异常
 */
public class JsonException extends NainuException {

    public JsonException(String message) {
        super(message);
    }

    public JsonException(String message, Throwable cause) {
        super(message, cause);
    }

    public JsonException(Throwable cause) {
        super(cause);
    }
}
