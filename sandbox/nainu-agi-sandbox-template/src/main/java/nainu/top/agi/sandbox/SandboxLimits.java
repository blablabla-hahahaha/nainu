package nainu.top.agi.sandbox;

/**
 * 沙箱执行资源上限。
 *
 * @param timeoutMs     执行超时（毫秒）。
 * @param maxMemoryMb   内存上限（MB）。
 * @param maxOutputBytes 标准输出上限（字节），超出截断。
 */
public record SandboxLimits(Long timeoutMs, Long maxMemoryMb, Long maxOutputBytes) {

    public static final SandboxLimits DEFAULT = new SandboxLimits(5_000L, 256L, 1_000_000L);

    public long timeoutMsOrDefault() {
        return timeoutMs == null ? DEFAULT.timeoutMs : timeoutMs;
    }

    public long maxMemoryMbOrDefault() {
        return maxMemoryMb == null ? DEFAULT.maxMemoryMb : maxMemoryMb;
    }

    public long maxOutputBytesOrDefault() {
        return maxOutputBytes == null ? DEFAULT.maxOutputBytes : maxOutputBytes;
    }
}
