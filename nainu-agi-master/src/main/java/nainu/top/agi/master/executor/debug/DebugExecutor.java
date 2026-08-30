package nainu.top.agi.master.executor.debug;

import com.fasterxml.jackson.core.type.TypeReference;
import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.common.exception.ErrorCategory;
import nainu.top.agi.common.exception.ErrorCodes;
import nainu.top.agi.common.exception.WorkflowException;
import nainu.top.agi.common.util.JsonUtils;
import nainu.top.agi.master.executor.NodeExecuteRequest;
import nainu.top.agi.master.executor.NodeExecutor;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * 调试节点执行器：优先用节点配置的 {@code jsonTemplate} 作为输出（模板即输出结构，确定性、可测），
 * 使「设置模板 result:"" 就输出 result」符合直觉。
 *
 * <p>「模板未配置/为空」与「模板配置了但非法」语义分开：
 * 前者是合法的空输出降级（未配置的调试节点不应产生演示数据），后者是用户的配置错误——抛
 * {@link WorkflowException}（{@link ErrorCategory#AUTHORING}），使其经 {@code NODE_FAILED} 大声失败，
 * 不再静默吞掉解析错误返回空结果。
 */
@Component
public class DebugExecutor implements NodeExecutor {

    @Override
    public NodeDefinition.NodeType getType() {
        return NodeDefinition.NodeType.DEBUG;
    }

    @Override
    public Map<String, Object> execute(NodeExecuteRequest request) {
        Object template = request.getConfig() == null ? null : request.getConfig().get("jsonTemplate");
        if (!(template instanceof String text) || text.isBlank()) {
            // 未配置模板：合法降级为空输出（区别于「配置了但非法」）。
            return Map.of();
        }
        try {
            Map<String, Object> parsed = JsonUtils.fromJson(text, new TypeReference<>() {
            });
            if (!(parsed instanceof Map<?, ?> m)) {
                throw new WorkflowException(ErrorCategory.AUTHORING, ErrorCodes.JSON_TEMPLATE_NOT_OBJECT,
                        "「输出内容」必须是一个合法的 JSON 对象（顶层不能是数组或单个值）");
            }
            Map<String, Object> result = new HashMap<>();
            m.forEach((k, v) -> result.put(String.valueOf(k), v));
            return result;
        } catch (WorkflowException e) {
            throw e;
        } catch (Exception e) {
            // 配置了 jsonTemplate 但解析失败：用户的配置错误，大声失败（不再静默输出空结果）。
            throw new WorkflowException(ErrorCategory.AUTHORING, ErrorCodes.JSON_TEMPLATE_INVALID,
                    "「输出内容」不是合法的 JSON 对象，请检查 JSON 格式是否正确", false, e);
        }
    }
}
