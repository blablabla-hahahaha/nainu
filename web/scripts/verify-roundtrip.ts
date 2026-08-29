/**
 * 前端 round-trip 校验：canonical → ReactFlow 投影 → canonical 幂等（图部分）。
 * 由 verify-dsl-contract 门禁调用；Node 直接执行（type stripping），零第三方依赖。
 */
import { from_canonical, to_canonical } from '../src/components/workflow/graph/react-flow-mapping.ts';
import type { workflow_graph, workflow_view } from '../src/components/workflow/graph/types.ts';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const demo_path = resolve(here, '../../nainu-agi-master/src/main/resources/workflow-demo.json');

function assert_roundtrip(graph: workflow_graph, view: workflow_view, label: string): void {
    const projected = from_canonical(graph, view);
    const { graph: g2, view: v2 } = to_canonical(projected.nodes, projected.edges);
    // 图级字段（id/name/version/meta）归页面所有，round-trip 只保证 nodes/edges 幂等
    const expected = { nodes: graph.nodes, edges: graph.edges };
    if (!deep_equal({ nodes: g2.nodes, edges: g2.edges }, expected)) {
        console.error(`✗ round-trip 不幂等：${label}`);
        console.error('  原图:  ', JSON.stringify(expected));
        console.error('  回读:  ', JSON.stringify({ nodes: g2.nodes, edges: g2.edges }));
        process.exit(1);
    }
    // view：有位置的节点位置不变
    for (const [nodeId, pos] of Object.entries(view.positions)) {
        const back = v2.positions[nodeId];
        if (!back || back.x !== pos.x || back.y !== pos.y) {
            console.error(`✗ 视图位置丢失：${label} 节点 ${nodeId}`);
            process.exit(1);
        }
    }
    console.log(`✓ round-trip 幂等：${label}`);
}

/** 键序无关深比较（对象按排序键递归）。 */
function deep_equal(a: unknown, b: unknown): boolean {
    if (a === b) {
        return true;
    }
    if (typeof a !== typeof b || a === null || b === null) {
        return false;
    }
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
            return false;
        }
        return a.every((v, i) => deep_equal(v, (b as unknown[])[i]));
    }
    if (typeof a === 'object' && typeof b === 'object') {
        const ka = Object.keys(a as Record<string, unknown>).sort();
        const kb = Object.keys(b as Record<string, unknown>).sort();
        if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) {
            return false;
        }
        return ka.every((k) => deep_equal((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
    }
    return false;
}

// 1) 仓库 demo（含条件边 + 脚本节点）——全节点预置位置
const demo = JSON.parse(readFileSync(demo_path, 'utf8')) as workflow_graph;
const demo_view: workflow_view = {
    positions: Object.fromEntries(demo.nodes.map((n, i) => [n.id, { x: 100 + i * 120, y: 100 }])),
};
assert_roundtrip(demo, demo_view, 'workflow-demo.json');

// 2) 最小图（无 config/input/output 的节点）
const minimal: workflow_graph = {
    id: 'minimal',
    name: '最小图',
    nodes: [
        { id: 'start', type: 'START' },
        { id: 'end', type: 'END' },
    ],
    edges: [{ id: 'e1', source: 'start', target: 'end' }],
};
assert_roundtrip(minimal, { positions: { start: { x: 0, y: 0 }, end: { x: 200, y: 0 } } }, '最小图');

// 3) 条件边图（edge.condition 往返）
const cond: workflow_graph = {
    id: 'cond',
    name: '条件图',
    nodes: [
        { id: 'start', type: 'START' },
        { id: 'c', type: 'CONDITION' },
        { id: 'a', type: 'DEBUG' },
        { id: 'end', type: 'END' },
    ],
    edges: [
        { id: 'e1', source: 'start', target: 'c' },
        {
            id: 'e2',
            source: 'c',
            target: 'a',
            sourceHandle: 'if',
            condition: {
                branchType: 'IF',
                logicOperator: 'AND',
                conditions: [{ field: { key: 'f', type: 'CUSTOM', value: '1' }, operator: 'EQUALS', value: '1' }],
            },
        },
        { id: 'e3', source: 'c', target: 'end', sourceHandle: 'else', condition: { branchType: 'ELSE' } },
        { id: 'e4', source: 'a', target: 'end' },
    ],
};
assert_roundtrip(cond, { positions: {} }, '条件边图');

console.log('✓ 前端 round-trip：全部通过');
