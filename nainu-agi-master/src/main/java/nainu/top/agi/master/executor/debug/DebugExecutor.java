package nainu.top.agi.master.executor.debug;

import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.slf4j.Slf4j;
import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.common.util.JsonUtils;
import nainu.top.agi.master.executor.NodeExecuteRequest;
import nainu.top.agi.master.executor.NodeExecutor;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * 调试节点执行器：优先用节点配置的 {@code jsonTemplate} 作为输出（模板即输出结构，确定性、可测），
 * 使「设置模板 result:"" 就输出 result」符合直觉；无有效模板时回退到固定演示数据，避免 demo 图跑空。
 */
@Slf4j
@Component
public class DebugExecutor implements NodeExecutor {

    @Override
    public NodeDefinition.NodeType getType() {
        return NodeDefinition.NodeType.DEBUG;
    }

    @Override
    public Map<String, Object> execute(NodeExecuteRequest request) {
        Object template = request.getConfig() == null ? null : request.getConfig().get("jsonTemplate");
        if (template instanceof String text && !text.isBlank()) {
            try {
                Map<String, Object> parsed = JsonUtils.fromJson(text, new TypeReference<>() {
                });
                if (parsed instanceof Map<?, ?> m) {
                    Map<String, Object> result = new HashMap<>();
                    m.forEach((k, v) -> result.put(String.valueOf(k), v));
                    return result;
                }
            } catch (Exception e) {
                log.warn("DebugExecutor 解析 jsonTemplate 失败（{}），输出空结果", e.getMessage());
            }
        }
        // 无有效模板时输出空对象（demo 图自带 jsonTemplate；未配置的调试节点不应产生演示数据）。
        return Map.of();
    }
}
