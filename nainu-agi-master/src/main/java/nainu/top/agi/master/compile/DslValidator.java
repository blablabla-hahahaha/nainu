package nainu.top.agi.master.compile;

import nainu.top.agi.common.dsl.ConditionCompareDefinition;
import nainu.top.agi.common.dsl.EdgeConditionDefinition;
import nainu.top.agi.common.dsl.EdgeDefinition;
import nainu.top.agi.common.dsl.GraphDefinition;
import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.common.dsl.NodeInputFieldDefinition;
import nainu.top.agi.common.dsl.NodeOutputFieldDefinition;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * DSL 图级校验器（Java 侧）：与 scripts/dsl-graph-rules.ts 共享同一规则清单与用例集。
 *
 * <p>JSON Schema 管结构，本类管图级规则（START 唯一、DAG、引用可解析、条件边合法性）。
 * 校验失败抛 {@link IllegalArgumentException}（大声失败）。
 */
public final class DslValidator {

    private DslValidator() {
    }

    public static void validate(GraphDefinition dsl) {
        List<String> errors = new ArrayList<>();
        List<NodeDefinition> nodes = dsl.getNodes() == null ? List.of() : dsl.getNodes();
        List<EdgeDefinition> edges = dsl.getEdges() == null ? List.of() : dsl.getEdges();

        Set<String> nodeIds = nodes.stream().map(NodeDefinition::getId).collect(Collectors.toSet());
        Map<String, NodeDefinition> nodeById = nodes.stream().collect(Collectors.toMap(NodeDefinition::getId, n -> n));

        // START 恰好一个；END 至多一个
        long starts = nodes.stream().filter(n -> n.getType() == NodeDefinition.NodeType.START).count();
        if (starts != 1) {
            errors.add("START 节点必须恰好一个，实际 " + starts + " 个");
        }
        long ends = nodes.stream().filter(n -> n.getType() == NodeDefinition.NodeType.END).count();
        if (ends > 1) {
            errors.add("END 节点至多一个，实际 " + ends + " 个");
        }

        // 边端点存在
        for (EdgeDefinition edge : edges) {
            if (!nodeIds.contains(edge.getSource())) {
                errors.add("边 " + edge.getId() + " 的 source「" + edge.getSource() + "」不存在");
            }
            if (!nodeIds.contains(edge.getTarget())) {
                errors.add("边 " + edge.getId() + " 的 target「" + edge.getTarget() + "」不存在");
            }
        }

        // sourceHandle 唯一（同一 source 下）
        Set<String> seenHandles = new HashSet<>();
        for (EdgeDefinition edge : edges) {
            if (edge.getSourceHandle() == null) {
                continue;
            }
            String key = edge.getSource() + ":" + edge.getSourceHandle();
            if (!seenHandles.add(key)) {
                errors.add("节点 " + edge.getSource() + " 的 sourceHandle「" + edge.getSourceHandle() + "」重复");
            }
        }

        // DAG：拓扑排序（含条件边的 target）
        Map<String, List<String>> adj = new HashMap<>();
        Map<String, Integer> indeg = new HashMap<>();
        for (NodeDefinition n : nodes) {
            adj.put(n.getId(), new ArrayList<>());
            indeg.put(n.getId(), 0);
        }
        for (EdgeDefinition edge : edges) {
            if (!nodeIds.contains(edge.getSource()) || !nodeIds.contains(edge.getTarget())) {
                continue;
            }
            adj.get(edge.getSource()).add(edge.getTarget());
            indeg.merge(edge.getTarget(), 1, Integer::sum);
        }
        Deque<String> queue = nodes.stream()
                .filter(n -> indeg.get(n.getId()) == 0)
                .map(NodeDefinition::getId)
                .collect(Collectors.toCollection(ArrayDeque::new));
        List<String> topo = new ArrayList<>();
        while (!queue.isEmpty()) {
            String id = queue.poll();
            topo.add(id);
            for (String target : adj.get(id)) {
                int d = indeg.get(target) - 1;
                indeg.put(target, d);
                if (d == 0) {
                    queue.add(target);
                }
            }
        }
        if (topo.size() != nodes.size()) {
            errors.add("图存在环（DAG 校验失败）");
        }

        // 条件边规则：按边数组序；至多一条 ELSE 且为最后一条；ELSE 无表达式；IF/ELIF 必须有表达式；
        // CONDITION 节点的出边必须全部为条件边（纯路由点，不混用静态边）
        Map<String, List<EdgeDefinition>> condBySource = new LinkedHashMap<>();
        for (EdgeDefinition edge : edges) {
            if (edge.getCondition() != null) {
                condBySource.computeIfAbsent(edge.getSource(), k -> new ArrayList<>()).add(edge);
            }
        }
        for (NodeDefinition n : nodes) {
            if (n.getType() == NodeDefinition.NodeType.CONDITION) {
                List<EdgeDefinition> out = edges.stream().filter(e -> Objects.equals(e.getSource(), n.getId())).toList();
                for (EdgeDefinition e : out) {
                    if (e.getCondition() == null) {
                        errors.add("CONDITION 节点 " + n.getId() + " 的出边必须全部为条件边（边 " + e.getId() + " 缺 condition）");
                    }
                }
            }
        }
        for (Map.Entry<String, List<EdgeDefinition>> entry : condBySource.entrySet()) {
            String source = entry.getKey();
            List<EdgeDefinition> list = entry.getValue();
            long elseCount = list.stream().filter(e -> e.getCondition().getBranchType() == EdgeConditionDefinition.BranchType.ELSE).count();
            if (elseCount > 1) {
                errors.add("节点 " + source + " 的条件出边有多条 ELSE");
            }
            EdgeDefinition last = list.get(list.size() - 1);
            if (last.getCondition().getBranchType() != EdgeConditionDefinition.BranchType.ELSE) {
                errors.add("节点 " + source + " 的条件出边最后一条必须是 ELSE");
            }
            for (EdgeDefinition edge : list) {
                EdgeConditionDefinition c = edge.getCondition();
                if (c.getBranchType() == EdgeConditionDefinition.BranchType.ELSE) {
                    if (c.getLogicOperator() != null || (c.getConditions() != null && !c.getConditions().isEmpty())) {
                        errors.add("节点 " + source + " 的 ELSE 分支禁止携带表达式");
                    }
                } else if (c.getLogicOperator() == null || c.getConditions() == null || c.getConditions().isEmpty()) {
                    errors.add("节点 " + source + " 的 " + c.getBranchType() + " 分支必须携带逻辑表达式");
                }
            }
        }

        // INTERNAL_REF 可解析（节点 input + 条件边 compare）：格式 nodeId:key；nodeId 为拓扑序上游且存在；key 为输出名（keyAlias ?? key）
        Map<String, Set<String>> outputNames = new HashMap<>();
        for (NodeDefinition n : nodes) {
            Set<String> names = new HashSet<>();
            for (NodeOutputFieldDefinition o : n.getOutput() == null ? List.<NodeOutputFieldDefinition>of() : n.getOutput()) {
                names.add(o.getKeyAlias() != null && !o.getKeyAlias().isEmpty() ? o.getKeyAlias() : o.getKey());
            }
            outputNames.put(n.getId(), names);
        }
        Map<String, List<String>> revAdj = new HashMap<>();
        for (NodeDefinition n : nodes) {
            revAdj.put(n.getId(), new ArrayList<>());
        }
        for (EdgeDefinition edge : edges) {
            if (nodeIds.contains(edge.getSource()) && nodeIds.contains(edge.getTarget())) {
                revAdj.get(edge.getTarget()).add(edge.getSource());
            }
        }
        for (NodeDefinition n : nodes) {
            List<NodeInputFieldDefinition> inputs = n.getInput() == null ? List.of() : n.getInput();
            for (NodeInputFieldDefinition f : inputs) {
                checkRef(f, n.getId(), nodeById, outputNames, revAdj, errors);
            }
        }
        for (EdgeDefinition edge : edges) {
            if (edge.getCondition() == null || edge.getCondition().getConditions() == null) {
                continue;
            }
            for (ConditionCompareDefinition compare : edge.getCondition().getConditions()) {
                if (compare.getField() != null && compare.getField().getType() == NodeInputFieldDefinition.FieldType.INTERNAL_REF) {
                    checkRef(compare.getField(), edge.getSource(), nodeById, outputNames, revAdj, errors);
                }
            }
        }

        if (!errors.isEmpty()) {
            throw new IllegalArgumentException("DSL 校验失败：" + String.join("；", errors));
        }
    }

    private static void checkRef(NodeInputFieldDefinition f, String ownerId,
                                 Map<String, NodeDefinition> nodeById, Map<String, Set<String>> outputNames,
                                 Map<String, List<String>> revAdj, List<String> errors) {
        if (f.getType() != NodeInputFieldDefinition.FieldType.INTERNAL_REF) {
            return;
        }
        String ref = f.getValue() == null ? "" : f.getValue();
        int idx = ref.indexOf(':');
        if (idx <= 0 || idx == ref.length() - 1) {
            errors.add("节点 " + ownerId + " 的 INTERNAL_REF 格式非法：" + ref + "（应为 nodeId:key）");
            return;
        }
        String refNode = ref.substring(0, idx);
        String refKey = ref.substring(idx + 1);
        if (!nodeById.containsKey(refNode)) {
            errors.add("节点 " + ownerId + " 的 INTERNAL_REF 引用不存在的节点：" + refNode);
            return;
        }
        if (Objects.equals(refNode, ownerId)) {
            errors.add("节点 " + ownerId + " 的 INTERNAL_REF 引用了自身：" + ref);
            return;
        }
        if (!ancestors(ownerId, revAdj).contains(refNode)) {
            errors.add("节点 " + ownerId + " 的 INTERNAL_REF 引用的「" + refNode + "」不是拓扑序上游节点");
            return;
        }
        if (!(outputNames.get(refNode) == null ? Set.of() : outputNames.get(refNode)).contains(refKey)) {
            errors.add("节点 " + ownerId + " 的 INTERNAL_REF 引用 " + refNode + " 不存在的输出：" + refKey);
        }
    }

    private static Set<String> ancestors(String id, Map<String, List<String>> revAdj) {
        Set<String> seen = new HashSet<>();
        Deque<String> stack = new ArrayDeque<>(revAdj.getOrDefault(id, List.of()));
        while (!stack.isEmpty()) {
            String a = stack.pop();
            if (seen.add(a)) {
                stack.addAll(revAdj.getOrDefault(a, List.of()));
            }
        }
        return seen;
    }
}
