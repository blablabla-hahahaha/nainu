package nainu.top.agi.master.workflow;

/**
 * 状态 key 约定：节点输出写入 OverAllState 的键为 {@code node:{nodeId}.{keyAlias}}；
 * INTERNAL_REF（{@code nodeId:key}）解析为同一键。adapter 与条件 router 共用。
 */
public final class StateKeys {

    private StateKeys() {
    }

    public static String of(String nodeId, String keyAlias) {
        return "node:" + nodeId + "." + keyAlias;
    }

    public static String ofRef(String ref) {
        int idx = ref.indexOf(':');
        if (idx <= 0 || idx == ref.length() - 1) {
            throw new IllegalArgumentException("INTERNAL_REF 格式非法（应为 nodeId:key）: " + ref);
        }
        return of(ref.substring(0, idx), ref.substring(idx + 1));
    }
}
