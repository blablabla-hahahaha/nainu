// 图级规则（JSON Schema 表达不了的部分）：前端校验器与后端校验器各自实现，共享本规则清单与 scripts/spec/dsl-contract.spec.ts 的用例集。

/** canonical DSL 的宽松类型（结构合法性由 schema 管，此处只管图级规则）。 */
export type dsl_graph = {
    id: string;
    name?: string;
    version?: number;
    meta?: Record<string, unknown>;
    nodes: dsl_node[];
    edges: dsl_edge[];
};

export type dsl_node = {
    id: string;
    type: string;
    config?: Record<string, unknown>;
    input?: dsl_input_field[];
    output?: dsl_output_field[];
};

export type dsl_input_field = { key: string; type: string; value: string };

export type dsl_output_field = { key: string; keyAlias?: string };

export type dsl_edge = {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    condition?: dsl_condition;
};

export type dsl_condition = {
    branchType: string;
    logicOperator?: string;
    conditions?: dsl_compare[];
};

export type dsl_compare = { field: dsl_input_field; operator: string; value: string };

/** 图级规则校验：返回错误列表（空 = 合法）。 */
export function validateGraph(dsl: dsl_graph): string[] {
    const errors: string[] = [];
    const nodes = dsl.nodes ?? [];
    const edges = dsl.edges ?? [];
    const nodeIds = new Set(nodes.map((n) => n.id));
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    // START 恰好一个；END 至多一个（可选标记，无 END 时执行自然结束）
    const starts = nodes.filter((n) => n.type === 'START');
    if (starts.length !== 1) errors.push(`START 节点必须恰好一个，实际 ${starts.length} 个`);
    const ends = nodes.filter((n) => n.type === 'END');
    if (ends.length > 1) errors.push(`END 节点至多一个，实际 ${ends.length} 个`);

    // 边端点存在
    for (const e of edges) {
        if (!nodeIds.has(e.source)) errors.push(`边 ${e.id} 的 source「${e.source}」不存在`);
        if (!nodeIds.has(e.target)) errors.push(`边 ${e.id} 的 target「${e.target}」不存在`);
    }

    // sourceHandle 唯一（同一 source 下）
    const seenHandles = new Set<string>();
    for (const e of edges) {
        if (!e.sourceHandle) continue;
        const key = `${e.source}:${e.sourceHandle}`;
        if (seenHandles.has(key)) errors.push(`节点 ${e.source} 的 sourceHandle「${e.sourceHandle}」重复`);
        seenHandles.add(key);
    }

    // DAG：拓扑排序（含条件边的 target）
    const adj = new Map<string, string[]>();
    const indeg = new Map<string, number>();
    for (const n of nodes) { adj.set(n.id, []); indeg.set(n.id, 0); }
    for (const e of edges) {
        if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
        adj.get(e.source)!.push(e.target);
        indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    }
    const topo: string[] = [];
    const queue = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
    while (queue.length > 0) {
        const id = queue.shift()!;
        topo.push(id);
        for (const t of adj.get(id) ?? []) {
            const d = (indeg.get(t) ?? 1) - 1;
            indeg.set(t, d);
            if (d === 0) queue.push(t);
        }
    }
    if (topo.length !== nodes.length) errors.push('图存在环（DAG 校验失败）');

    // 条件边规则：按边数组序；至多一条 ELSE 且为最后一条；ELSE 无表达式；IF/ELIF 必须有表达式；
    // CONDITION 节点的出边必须全部为条件边（纯路由点，不混用静态边）
    const condBySource = new Map<string, dsl_edge[]>();
    for (const e of edges) {
        if (!e.condition) continue;
        const list = condBySource.get(e.source) ?? [];
        list.push(e);
        condBySource.set(e.source, list);
    }
    for (const n of nodes) {
        if (n.type === 'CONDITION') {
            for (const e of edges.filter((x) => x.source === n.id)) {
                if (!e.condition) errors.push(`CONDITION 节点 ${n.id} 的出边必须全部为条件边（边 ${e.id} 缺 condition）`);
            }
        }
    }
    for (const [source, list] of condBySource) {
        const elseCount = list.filter((e) => e.condition!.branchType === 'ELSE').length;
        if (elseCount > 1) errors.push(`节点 ${source} 的条件出边有多条 ELSE`);
        const last = list[list.length - 1];
        if (last.condition!.branchType !== 'ELSE') errors.push(`节点 ${source} 的条件出边最后一条必须是 ELSE`);
        for (const e of list) {
            const c = e.condition!;
            if (c.branchType === 'ELSE') {
                if (c.logicOperator || (c.conditions ?? []).length > 0) {
                    errors.push(`节点 ${source} 的 ELSE 分支禁止携带表达式`);
                }
            } else if (!c.logicOperator || (c.conditions ?? []).length === 0) {
                errors.push(`节点 ${source} 的 ${c.branchType} 分支必须携带逻辑表达式`);
            }
        }
    }

    // INTERNAL_REF 可解析：格式 nodeId:key；nodeId 为拓扑序上游且存在；key 为该节点输出名（keyAlias ?? key）
    const outputNames = new Map<string, Set<string>>();
    for (const n of nodes) {
        const names = new Set<string>();
        for (const o of n.output ?? []) names.add(o.keyAlias ?? o.key);
        outputNames.set(n.id, names);
    }
    const revAdj = new Map<string, string[]>();
    for (const n of nodes) revAdj.set(n.id, []);
    for (const e of edges) {
        if (nodeIds.has(e.source) && nodeIds.has(e.target)) revAdj.get(e.target)!.push(e.source);
    }
    for (const n of nodes) {
        for (const f of n.input ?? []) {
            if (f.type === 'INTERNAL_REF') {
                checkRef(f, n.id, nodeById, outputNames, revAdj, errors);
            }
        }
    }
    // 条件边 compare 的字段引用与节点 input 同规则（owner = 边的 source）
    for (const e of edges) {
        for (const c of e.condition?.conditions ?? []) {
            if (c.field?.type === 'INTERNAL_REF') {
                checkRef(c.field, e.source, nodeById, outputNames, revAdj, errors);
            }
        }
    }

    return errors;
}

function checkRef(
    f: dsl_input_field,
    ownerId: string,
    nodeById: Map<string, dsl_node>,
    outputNames: Map<string, Set<string>>,
    revAdj: Map<string, string[]>,
    errors: string[],
): void {
    const ref = f.value ?? '';
    const idx = ref.indexOf(':');
    if (idx <= 0 || idx === ref.length - 1) {
        errors.push(`节点 ${ownerId} 的 INTERNAL_REF 格式非法：${ref}（应为 nodeId:key）`);
        return;
    }
    const refNode = ref.slice(0, idx);
    const refKey = ref.slice(idx + 1);
    if (!nodeById.has(refNode)) {
        errors.push(`节点 ${ownerId} 的 INTERNAL_REF 引用不存在的节点：${refNode}`);
        return;
    }
    if (refNode === ownerId) {
        errors.push(`节点 ${ownerId} 的 INTERNAL_REF 引用了自身：${ref}`);
        return;
    }
    if (!ancestors(ownerId, revAdj).has(refNode)) {
        errors.push(`节点 ${ownerId} 的 INTERNAL_REF 引用的「${refNode}」不是拓扑序上游节点`);
        return;
    }
    if (!(outputNames.get(refNode) ?? new Set<string>()).has(refKey)) {
        errors.push(`节点 ${ownerId} 的 INTERNAL_REF 引用 ${refNode} 不存在的输出：${refKey}`);
    }
}

function ancestors(id: string, revAdj: Map<string, string[]>): Set<string> {
    const seen = new Set<string>();
    const stack = [...(revAdj.get(id) ?? [])];
    while (stack.length > 0) {
        const a = stack.pop()!;
        if (seen.has(a)) continue;
        seen.add(a);
        stack.push(...(revAdj.get(a) ?? []));
    }
    return seen;
}
