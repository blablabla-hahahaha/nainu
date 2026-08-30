package nainu.top.agi.common.exception;

/**
 * 稳定错误码：与消息解耦，供前端据此分类提示与支持排查；不得随消息文案变化。
 */
public final class ErrorCodes {

    private ErrorCodes() {
    }

    /** jsonTemplate 非法（不是合法 JSON 对象）。 */
    public static final String JSON_TEMPLATE_INVALID = "JSON_TEMPLATE_INVALID";

    /** jsonTemplate 语义非法（数组/原始值）。 */
    public static final String JSON_TEMPLATE_NOT_OBJECT = "JSON_TEMPLATE_NOT_OBJECT";

    /** 脚本执行失败（语法/运行时/类型错误）。 */
    public static final String SCRIPT_EXECUTION_FAILED = "SCRIPT_EXECUTION_FAILED";

    /** 脚本内容为空。 */
    public static final String SCRIPT_EMPTY = "SCRIPT_EMPTY";

    /** 脚本语言不支持。 */
    public static final String SCRIPT_UNSUPPORTED_LANGUAGE = "SCRIPT_UNSUPPORTED_LANGUAGE";

    /** DSL 图级校验失败。 */
    public static final String DSL_INVALID = "DSL_INVALID";

    /** 条件分支无命中且无 ELSE。 */
    public static final String CONDITION_NO_MATCH = "CONDITION_NO_MATCH";
}
