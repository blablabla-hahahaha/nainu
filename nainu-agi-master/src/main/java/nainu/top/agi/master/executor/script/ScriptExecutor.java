package nainu.top.agi.master.executor.script;

import nainu.top.agi.common.dsl.NodeDefinition;
import nainu.top.agi.common.util.JsonUtils;
import nainu.top.agi.master.executor.NodeExecuteRequest;
import nainu.top.agi.master.executor.NodeExecutor;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.HostAccess;
import org.graalvm.polyglot.ResourceLimits;
import org.graalvm.polyglot.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * 脚本节点执行器：GraalVM 嵌入沙箱执行 JS（阶段一首语言，Python 延后）。
 *
 * <p>契约：注入 {@code params}（按 input 解析的键值对象，JSON 注入为纯 JS 对象）；
 * 脚本必须定义 {@code main()}；返回值按 output 映射写回状态。
 * 沙箱：无 host 访问、无 IO、语句数上限（防死循环主守卫）+ onLimit 日志；
 * timeLimit / maxHeapMemory 待 GraalVM 升级后补齐（阶段四治理演进）。
 * 脚本应无副作用或幂等（graph-core at-least-once 语义下节点可能重跑）。
 */
@Component
public class ScriptExecutor implements NodeExecutor {

    private static final Logger log = LoggerFactory.getLogger(ScriptExecutor.class);

    private static final long MAX_STATEMENTS = 10_000_000L;

    @Override
    public NodeDefinition.NodeType getType() {
        return NodeDefinition.NodeType.SCRIPT;
    }

    @Override
    public Map<String, Object> execute(NodeExecuteRequest request) {
        Map<String, Object> config = request.getConfig();
        if (config == null) {
            throw new IllegalArgumentException("脚本节点缺少 config（language/script）");
        }
        String language = String.valueOf(config.getOrDefault("language", "javascript"));
        String script = String.valueOf(config.get("script"));
        if (script == null || script.isEmpty()) {
            throw new IllegalArgumentException("脚本内容为空");
        }
        if (!"javascript".equalsIgnoreCase(language)) {
            throw new IllegalArgumentException("暂不支持脚本语言: " + language + "（当前仅 javascript）");
        }

        String paramsJson = JsonUtils.toJson(request.getResolvedInputs() == null ? Map.of() : request.getResolvedInputs());

        ResourceLimits limits = ResourceLimits.newBuilder()
                .statementLimit(MAX_STATEMENTS, source -> true)
                .onLimit(event -> log.warn("脚本达到语句数上限，执行将被终止"))
                .build();

        try (Context context = Context.newBuilder("js")
                .allowHostAccess(HostAccess.NONE)
                .allowIO(false)
                .resourceLimits(limits)
                .build()) {
            context.eval("js", "params = " + paramsJson + ";");
            context.eval("js", script + "\nmain();");
            Value bindings = context.getBindings("js");
            Value main = bindings.getMember("main");
            Value result = main.execute();
            return toResultMap(result);
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("脚本执行失败: " + e.getMessage(), e);
        }
    }

    private static Map<String, Object> toResultMap(Value result) {
        Map<String, Object> map = new HashMap<>();
        if (result == null || result.isNull() || !result.hasMembers()) {
            return map;
        }
        for (String key : result.getMemberKeys()) {
            map.put(key, toJavaValue(result.getMember(key)));
        }
        return map;
    }

    private static Object toJavaValue(Value value) {
        if (value == null || value.isNull()) {
            return null;
        }
        if (value.isNumber()) {
            return value.fitsInLong() ? value.asLong() : value.asDouble();
        }
        if (value.isBoolean()) {
            return value.asBoolean();
        }
        if (value.isString()) {
            return value.asString();
        }
        if (value.hasArrayElements()) {
            java.util.List<Object> list = new java.util.ArrayList<>();
            for (long i = 0; i < value.getArraySize(); i++) {
                list.add(toJavaValue(value.getArrayElement(i)));
            }
            return list;
        }
        if (value.hasMembers()) {
            Map<String, Object> map = new HashMap<>();
            for (String key : value.getMemberKeys()) {
                map.put(key, toJavaValue(value.getMember(key)));
            }
            return map;
        }
        return value.toString();
    }
}
