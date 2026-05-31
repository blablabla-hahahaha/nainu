package nainu.top.agi.common.exception;

public class LockAcquisitionException extends NainuException {

    public LockAcquisitionException(String message) {
        super(message);
    }

    public LockAcquisitionException(String message, Throwable cause) {
        super(message, cause);
    }

    public LockAcquisitionException(Throwable cause) {
        super(cause);
    }
}
