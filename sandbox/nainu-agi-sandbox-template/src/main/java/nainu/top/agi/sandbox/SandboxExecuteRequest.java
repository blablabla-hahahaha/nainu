package nainu.top.agi.sandbox;

import java.util.Map;

/**
 * 沙箱执行请求：跑一段脚本并记录参数。
 *
 * @param language     脚本语言。
 * @param script       脚本源码（约定定义 {@code main()}，返回值作为节点输出）。
 * @param params       注入的脚本参数。（节点输入解析后的键值对象，JSON 注入。）
 * @param limits       资源上限（为空用默认）。
 * @param image        可选：沙箱镜像标识（插件化/镜像目录预留，当前实现忽略）。
 * @param workflowId   可选：会话绑定的工作流 id（同一工作流复用一个沙箱）。
 * @param nodeId       可选：发起节点 id（审计与定位）。
 */
public record SandboxExecuteRequest(
        SandboxLanguage language,
        String script,
        Map<String, Object> params,
        SandboxLimits limits,
        String image,
        String workflowId,
        String nodeId) {

    public static SandboxExecuteRequest of(SandboxLanguage language, String script, Map<String, Object> params) {
        return new SandboxExecuteRequest(language, script, params, SandboxLimits.DEFAULT, null, null, null);
    }

    public SandboxLimits limitsOrDefault() {
        return limits == null ? SandboxLimits.DEFAULT : limits;
    }
}
