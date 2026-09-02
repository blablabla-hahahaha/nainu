package nainu.top.agi.sandbox;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 沙箱支持的脚本语言。
 *
 * <p>线上传输用小写规范名（{@code python} / {@code javascript}，见 {@link #code()}），
 * 经 {@link #fromCode(String)} 大小写不敏感解析；未知语言由调用方按
 * {@link nainu.top.agi.common.exception.ErrorCategory#PLATFORM} 归类。
 */
public enum SandboxLanguage {

    JAVASCRIPT("javascript"),
    PYTHON("python");

    private final String code;

    SandboxLanguage(String code) {
        this.code = code;
    }

    /** 线上传输的规范名（小写）。 */
    @JsonValue
    public String code() {
        return code;
    }

    /** 从规范名解析；大小写不敏感，未知抛 {@link IllegalArgumentException}。 */
    @JsonCreator
    public static SandboxLanguage fromCode(String code) {
        for (SandboxLanguage language : values()) {
            if (language.code.equalsIgnoreCase(code)) {
                return language;
            }
        }
        throw new IllegalArgumentException("不支持的沙箱语言: " + code);
    }
}
