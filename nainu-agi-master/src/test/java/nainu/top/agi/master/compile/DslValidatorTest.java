package nainu.top.agi.master.compile;

import nainu.top.agi.common.dsl.ConditionCompareDefinition;
import nainu.top.agi.common.dsl.EdgeConditionDefinition;
import nainu.top.agi.common.dsl.EdgeDefinition;
import nainu.top.agi.common.dsl.GraphDefinition;
import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.common.dsl.NodeInputFieldDefinition;
import nainu.top.agi.common.dsl.NodeOutputFieldDefinition;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * DslValidator 图级规则测试：与 scripts/spec/dsl-contract.spec.ts 共享同一组非法用例
 * （前后端双拒）。改动规则必须同步两份用例。
 */
class DslValidatorTest {

    @Test
    void acceptsValidGraph() {
        assertDoesNotThrow(() -> DslValidator.validate(validGraph()));
    }

    @Test
    void rejectsMissingStart() {
        GraphDefinition g = validGraph();
        g.setNodes(g.getNodes().stream().filter(n -> !"start".equals(n.getId())).toList());
        assertThrows(IllegalArgumentException.class, () -> DslValidator.validate(g));
    }

    @Test
    void rejectsCycle() {
        GraphDefinition g = validGraph();
        g.setEdges(List.of(
                edge("e1", "start", "debug"),
                edge("e2", "debug", "cond"),
                edge("e3", "cond", "debug"),
                condEdge("e4", "cond", "end", "else", "ELSE", null, null)));
        assertThrows(IllegalArgumentException.class, () -> DslValidator.validate(g));
    }

    @Test
    void rejectsDanglingRefNode() {
        GraphDefinition g = validGraph();
        g.getNodes().get(1).setInput(List.of(ref("ghost", "k")));
        assertThrows(IllegalArgumentException.class, () -> DslValidator.validate(g));
    }

    @Test
    void rejectsRefToNonUpstream() {
        GraphDefinition g = validGraph();
        NodeDefinition isolated = node("iso", NodeDefinition.NodeType.DEBUG);
        isolated.setOutput(List.of(output("k", "k")));
        g.getNodes().get(2).setInput(List.of(ref("iso", "k")));
        g.setNodes(List.of(g.getNodes().get(0), g.getNodes().get(1), g.getNodes().get(2), isolated, g.getNodes().get(4)));
        assertThrows(IllegalArgumentException.class, () -> DslValidator.validate(g));
    }

    @Test
    void rejectsElseNotLast() {
        GraphDefinition g = validGraph();
        g.setEdges(List.of(
                edge("e1", "start", "debug"),
                edge("e2", "debug", "cond"),
                condEdge("e3", "cond", "ok", "else", "ELSE", null, null),
                condEdge("e4", "cond", "end", "if", "IF", "AND", compare(ref("debug", "ka"), "EQUALS", "x"))));
        assertThrows(IllegalArgumentException.class, () -> DslValidator.validate(g));
    }

    @Test
    void rejectsConditionWithStaticEdge() {
        GraphDefinition g = validGraph();
        g.setEdges(List.of(
                edge("e1", "start", "debug"),
                edge("e2", "debug", "cond"),
                edge("e3", "cond", "ok")));
        assertThrows(IllegalArgumentException.class, () -> DslValidator.validate(g));
    }

    @Test
    void rejectsInvalidRefInConditionCompare() {
        GraphDefinition g = validGraph();
        g.setEdges(List.of(
                edge("e1", "start", "debug"),
                edge("e2", "debug", "cond"),
                condEdge("e3", "cond", "ok", "if", "IF", "AND",
                        compare(ref("ghost", "ka"), "EQUALS", "x")),
                condEdge("e4", "cond", "end", "else", "ELSE", null, null)));
        assertThrows(IllegalArgumentException.class, () -> DslValidator.validate(g));
    }

    // ---------- builders ----------

    private static GraphDefinition validGraph() {
        GraphDefinition g = new GraphDefinition();
        g.setId("w1");
        g.setName("合法图");
        NodeDefinition start = node("start", NodeDefinition.NodeType.START);
        NodeDefinition debug = node("debug", NodeDefinition.NodeType.DEBUG);
        debug.setOutput(List.of(output("k", "ka")));
        NodeDefinition cond = node("cond", NodeDefinition.NodeType.CONDITION);
        NodeDefinition ok = node("ok", NodeDefinition.NodeType.DEBUG);
        NodeDefinition end = node("end", NodeDefinition.NodeType.END);
        g.setNodes(List.of(start, debug, cond, ok, end));
        g.setEdges(List.of(
                edge("e1", "start", "debug"),
                edge("e2", "debug", "cond"),
                condEdge("e3", "cond", "ok", "if", "IF", "AND",
                        compare(ref("debug", "ka"), "EQUALS", "x")),
                condEdge("e4", "cond", "end", "else", "ELSE", null, null)));
        return g;
    }

    private static NodeDefinition node(String id, NodeDefinition.NodeType type) {
        NodeDefinition n = new NodeDefinition();
        n.setId(id);
        n.setType(type);
        return n;
    }

    private static NodeOutputFieldDefinition output(String key, String alias) {
        NodeOutputFieldDefinition o = new NodeOutputFieldDefinition();
        o.setKey(key);
        o.setKeyAlias(alias);
        return o;
    }

    private static NodeInputFieldDefinition input(String key, NodeInputFieldDefinition.FieldType type, String value) {
        NodeInputFieldDefinition f = new NodeInputFieldDefinition();
        f.setKey(key);
        f.setType(type);
        f.setValue(value);
        return f;
    }

    private static NodeInputFieldDefinition ref(String nodeId, String key) {
        return input("f", NodeInputFieldDefinition.FieldType.INTERNAL_REF, nodeId + ":" + key);
    }

    private static EdgeDefinition edge(String id, String source, String target) {
        EdgeDefinition e = new EdgeDefinition();
        e.setId(id);
        e.setSource(source);
        e.setTarget(target);
        return e;
    }

    private static EdgeDefinition condEdge(String id, String source, String target, String handle,
                                           String branchType, String logic, ConditionCompareDefinition compare) {
        EdgeDefinition e = edge(id, source, target);
        e.setSourceHandle(handle);
        EdgeConditionDefinition c = new EdgeConditionDefinition();
        c.setBranchType(EdgeConditionDefinition.BranchType.valueOf(branchType));
        if (logic != null) {
            c.setLogicOperator(EdgeConditionDefinition.LogicOperator.valueOf(logic));
        }
        if (compare != null) {
            c.setConditions(List.of(compare));
        }
        e.setCondition(c);
        return e;
    }

    private static ConditionCompareDefinition compare(NodeInputFieldDefinition field, String operator, String value) {
        ConditionCompareDefinition c = new ConditionCompareDefinition();
        c.setField(field);
        c.setOperator(ConditionCompareDefinition.CompareOperator.valueOf(operator));
        c.setValue(value);
        return c;
    }
}
