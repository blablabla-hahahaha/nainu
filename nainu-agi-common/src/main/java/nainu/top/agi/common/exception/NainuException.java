package nainu.top.agi.common.exception;

public class NainuException extends RuntimeException {

    public NainuException() {
    }

    public NainuException(String message) {
        super(message);
    }

    public NainuException(String message, Throwable cause) {
        super(message, cause);
    }

    public NainuException(Throwable cause) {
        super(cause);
    }

    public NainuException(String message, Throwable cause, boolean enableSuppression,
                         boolean writableStackTrace) {
        super(message, cause, enableSuppression, writableStackTrace);
    }
}
