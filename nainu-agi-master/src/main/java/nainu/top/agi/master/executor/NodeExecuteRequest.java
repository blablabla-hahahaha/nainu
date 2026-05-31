package nainu.top.agi.master.executor;

import lombok.AllArgsConstructor;
import lombok.Data;
import nainu.top.agi.common.dsl.NodeDefinition;

import java.util.Map;

/**
 * 节点执行请求：config + 已解析的输入字段（adapter 负责从状态解析 INTERNAL_REF）。
 */
@Data
@AllArgsConstructor
public class NodeExecuteRequest {

    private String nodeId;

    private NodeDefinition.NodeType type;

    private Map<String, Object> config;

    private Map<String, Object> resolvedInputs;
}
