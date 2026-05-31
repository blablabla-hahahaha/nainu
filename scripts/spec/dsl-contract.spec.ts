// verify-dsl-contract 的非法/合法用例：图级规则与 schema 结构校验必须拒绝非法图、放行合法图。

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { validateGraph } from '../dsl-graph-rules.ts';
import { cleanup, expectPass, fixtureRoot, repoRoot, runGate, write } from './lib.ts';

// ---------- 合法图（图级规则 + schema 结构都应放行） ----------
const valid_graph = {
    id: 'w1',
    name: '合法图',
    nodes: [
        { id: 'start', type: 'START' },
        { id: 'debug', type: 'DEBUG', output: [{ key: 'k', keyAlias: 'ka' }] },
        { id: 'cond', type: 'CONDITION' },
        { id: 'ok', type: 'DEBUG' },
        { id: 'end', type: 'END' },
    ],
    edges: [
        { id: 'e1', source: 'start', target: 'debug' },
        { id: 'e2', source: 'debug', target: 'cond' },
        {
            id: 'e3', source: 'cond', target: 'ok', sourceHandle: 'if',
            condition: {
                branchType: 'IF', logicOperator: 'AND',
                conditions: [{ field: { key: 'f', type: 'INTERNAL_REF', value: 'debug:ka' }, operator: 'EQUALS', value: 'x' }],
            },
        },
        { id: 'e4', source: 'cond', target: 'end', sourceHandle: 'else', condition: { branchType: 'ELSE' } },
    ],
};

const graphErrors = validateGraph(valid_graph as never);
if (graphErrors.length !== 0) {
    console.error(`✗ 合法图被图级规则误杀：\n  ${graphErrors.join('\n  ')}`);
    process.exit(1);
}
console.log('✓ 图级规则放行：合法图');

// ---------- 图级规则非法用例 ----------
const base_nodes = [
    { id: 'start', type: 'START' },
    { id: 'debug', type: 'DEBUG', output: [{ key: 'k', keyAlias: 'ka' }] },
    { id: 'end', type: 'END' },
];
const base_edges = [
    { id: 'e1', source: 'start', target: 'debug' },
    { id: 'e2', source: 'debug', target: 'end' },
];

const illegal_cases: Array<[string, unknown]> = [
    ['无 START', { id: 'w', name: 'x', nodes: base_nodes.slice(1), edges: base_edges }],
    ['双 START', { id: 'w', name: 'x', nodes: [...base_nodes, { id: 'start2', type: 'START' }], edges: base_edges }],
    ['双 END', { id: 'w', name: 'x', nodes: [...base_nodes, { id: 'end2', type: 'END' }], edges: base_edges }],
    ['有环', {
        id: 'w', name: 'x', nodes: [...base_nodes, { id: 'c', type: 'DEBUG' }],
        edges: [...base_edges, { id: 'e3', source: 'c', target: 'debug' }, { id: 'e4', source: 'debug', target: 'c' }],
    }],
    ['悬空边 source', { id: 'w', name: 'x', nodes: base_nodes, edges: [{ id: 'e', source: 'ghost', target: 'end' }] }],
    ['悬空边 target', { id: 'w', name: 'x', nodes: base_nodes, edges: [{ id: 'e', source: 'start', target: 'ghost' }] }],
    ['悬空 ref 节点', {
        id: 'w', name: 'x',
        nodes: [{ id: 'start', type: 'START' }, { id: 'a', type: 'DEBUG', input: [{ key: 'f', type: 'INTERNAL_REF', value: 'ghost:k' }] }, { id: 'end', type: 'END' }],
        edges: base_edges,
    }],
    ['ref 格式非法', {
        id: 'w', name: 'x',
        nodes: [{ id: 'start', type: 'START' }, { id: 'a', type: 'DEBUG', input: [{ key: 'f', type: 'INTERNAL_REF', value: 'no-colon' }] }, { id: 'end', type: 'END' }],
        edges: base_edges,
    }],
    ['ref 引用自身', {
        id: 'w', name: 'x',
        nodes: [{ id: 'start', type: 'START' }, { id: 'a', type: 'DEBUG', input: [{ key: 'f', type: 'INTERNAL_REF', value: 'a:k' }] }, { id: 'end', type: 'END' }],
        edges: base_edges,
    }],
    ['ref 引用非上游节点', {
        id: 'w', name: 'x',
        nodes: [{ id: 'start', type: 'START' }, { id: 'a', type: 'DEBUG' }, { id: 'b', type: 'DEBUG', input: [{ key: 'f', type: 'INTERNAL_REF', value: 'a:k' }] }, { id: 'end', type: 'END' }],
        edges: [{ id: 'e1', source: 'start', target: 'b' }, { id: 'e2', source: 'b', target: 'end' }],
    }],
    ['ref 输出不存在', {
        id: 'w', name: 'x',
        nodes: [{ id: 'start', type: 'START' }, { id: 'a', type: 'DEBUG', output: [{ key: 'k' }] }, { id: 'b', type: 'DEBUG', input: [{ key: 'f', type: 'INTERNAL_REF', value: 'a:missing' }] }, { id: 'end', type: 'END' }],
        edges: [{ id: 'e1', source: 'start', target: 'a' }, { id: 'e2', source: 'a', target: 'b' }, { id: 'e3', source: 'b', target: 'end' }],
    }],
    ['ELSE 非最后', {
        id: 'w', name: 'x',
        nodes: [{ id: 'start', type: 'START' }, { id: 'c', type: 'CONDITION' }, { id: 'a', type: 'DEBUG' }, { id: 'b', type: 'DEBUG' }, { id: 'end', type: 'END' }],
        edges: [
            { id: 'e1', source: 'start', target: 'c' },
            { id: 'e2', source: 'c', target: 'a', sourceHandle: 'else', condition: { branchType: 'ELSE' } },
            { id: 'e3', source: 'c', target: 'b', sourceHandle: 'if', condition: { branchType: 'IF', logicOperator: 'AND', conditions: [{ field: { key: 'f', type: 'CUSTOM', value: '1' }, operator: 'EQUALS', value: '1' }] } },
            { id: 'e4', source: 'b', target: 'end' },
            { id: 'e5', source: 'a', target: 'end' },
        ],
    }],
    ['ELSE 带表达式', {
        id: 'w', name: 'x',
        nodes: [{ id: 'start', type: 'START' }, { id: 'c', type: 'CONDITION' }, { id: 'a', type: 'DEBUG' }, { id: 'end', type: 'END' }],
        edges: [
            { id: 'e1', source: 'start', target: 'c' },
            { id: 'e2', source: 'c', target: 'a', sourceHandle: 'else', condition: { branchType: 'ELSE', logicOperator: 'AND', conditions: [{ field: { key: 'f', type: 'CUSTOM', value: '1' }, operator: 'EQUALS', value: '1' }] } },
            { id: 'e3', source: 'a', target: 'end' },
        ],
    }],
    ['IF 无表达式', {
        id: 'w', name: 'x',
        nodes: [{ id: 'start', type: 'START' }, { id: 'c', type: 'CONDITION' }, { id: 'a', type: 'DEBUG' }, { id: 'end', type: 'END' }],
        edges: [
            { id: 'e1', source: 'start', target: 'c' },
            { id: 'e2', source: 'c', target: 'a', sourceHandle: 'if', condition: { branchType: 'IF' } },
            { id: 'e3', source: 'a', target: 'end' },
        ],
    }],
    ['handle 重复', {
        id: 'w', name: 'x',
        nodes: [{ id: 'start', type: 'START' }, { id: 'c', type: 'CONDITION' }, { id: 'a', type: 'DEBUG' }, { id: 'b', type: 'DEBUG' }, { id: 'end', type: 'END' }],
        edges: [
            { id: 'e1', source: 'start', target: 'c' },
            { id: 'e2', source: 'c', target: 'a', sourceHandle: 'same', condition: { branchType: 'IF', logicOperator: 'AND', conditions: [{ field: { key: 'f', type: 'CUSTOM', value: '1' }, operator: 'EQUALS', value: '1' }] } },
            { id: 'e3', source: 'c', target: 'b', sourceHandle: 'same', condition: { branchType: 'ELSE' } },
            { id: 'e4', source: 'a', target: 'end' },
            { id: 'e5', source: 'b', target: 'end' },
        ],
    }],
    ['CONDITION 混用静态出边', {
        id: 'w', name: 'x',
        nodes: [{ id: 'start', type: 'START' }, { id: 'c', type: 'CONDITION' }, { id: 'a', type: 'DEBUG' }, { id: 'end', type: 'END' }],
        edges: [
            { id: 'e1', source: 'start', target: 'c' },
            { id: 'e2', source: 'c', target: 'a' },
            { id: 'e3', source: 'a', target: 'end' },
        ],
    }],
];

for (const [label, dsl] of illegal_cases) {
    const errs = validateGraph(dsl as never);
    if (errs.length === 0) {
        console.error(`✗ 图级规则未拒绝非法用例：${label}`);
        process.exit(1);
    }
    console.log(`✓ 图级规则拒绝：${label}`);
}

// ---------- schema 结构校验（ajv 脚本） ----------
const dir = fixtureRoot();
try {
    write(dir, 'valid.json', JSON.stringify(valid_graph));
    const good = spawnSync('node', ['web/scripts/validate-dsl.mjs', join(dir, 'valid.json')], { cwd: repoRoot, encoding: 'utf8' });
    if (good.status !== 0) {
        console.error(`✗ 合法图未通过 schema 结构校验\n${good.stdout}${good.stderr}`);
        process.exit(1);
    }
    console.log('✓ schema 结构校验放行：合法图');

    const structural_illegal: Array<[string, unknown]> = [
        ['缺顶层 id', { name: 'x', nodes: [], edges: [] }],
        ['缺 nodes', { id: 'w', name: 'x', edges: [] }],
        ['坏 nodeType 枚举', { id: 'w', name: 'x', nodes: [{ id: 'n', type: 'MAGIC' }], edges: [] }],
        ['边缺 target', { id: 'w', name: 'x', nodes: [{ id: 'a', type: 'START' }], edges: [{ id: 'e', source: 'a' }] }],
        ['inputField 缺 value', { id: 'w', name: 'x', nodes: [{ id: 'a', type: 'DEBUG', input: [{ key: 'k', type: 'CUSTOM' }] }], edges: [] }],
        ['未知顶层字段', { id: 'w', name: 'x', nodes: [], edges: [], bogus: 1 }],
    ];
    for (const [label, dsl] of structural_illegal) {
        const file = join(dir, 'bad.json');
        write(dir, 'bad.json', JSON.stringify(dsl));
        const r = spawnSync('node', ['web/scripts/validate-dsl.mjs', file], { cwd: repoRoot, encoding: 'utf8' });
        if (r.status === 0) {
            console.error(`✗ schema 结构校验未拒绝非法用例：${label}`);
            process.exit(1);
        }
        console.log(`✓ schema 结构校验拒绝：${label}`);
    }

    // ---------- 门禁对仓库当前状态通过（合法路径验收） ----------
    const gate = runGate('verify-dsl-contract', repoRoot);
    expectPass('verify-dsl-contract 对仓库当前状态通过', gate);
} finally {
    cleanup(dir);
}
