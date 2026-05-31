// 门禁调度器：编排已存在的 verify-* 脚本（有依赖图 + 并发 + 模式），自身不写测试逻辑。
// 用法：node scripts/run-gates.ts [mode]   mode ∈ all(默认) | doc | notes | hygiene
// 配套：scripts/spec/ 下每条门禁的非法用例 spec；npm run verify:spec 运行。

import { spawn } from 'node:child_process';
import { repoRoot } from './lib.ts';

type Gate = {
  id: string;
  /** 实际脚本文件名（scripts/<file>.ts） */
  file: string;
  label: string;
  mode: string;
  needs?: string[];
};

const GATES: Gate[] = [
  { id: 'md-wrap', file: 'verify-md-wrap', label: 'Markdown 一段一行', mode: 'doc' },
  { id: 'md-links', file: 'verify-md-links', label: '相对链接不死链', mode: 'doc' },
  { id: 'doc-budgets', file: 'verify-doc-budgets', label: '常驻文档词数预算', mode: 'doc' },
  { id: 'agent-note-tree', file: 'agent-note-tree', label: 'Agent Notes 封闭集合结构', mode: 'notes' },
  { id: 'agent-note-format', file: 'verify-agent-note-format', label: 'Agent Note 骨架', mode: 'notes', needs: ['agent-note-tree'] },
  { id: 'archived-notes', file: 'verify-archived-agent-notes', label: '归档 Agent Note 冻结', mode: 'notes', needs: ['agent-note-tree'] },
  { id: 'todo-grade', file: 'verify-todo-grade', label: 'TODO 标记分级', mode: 'hygiene' },
  { id: 'file-hygiene', file: 'verify-file-hygiene', label: '文件卫生', mode: 'hygiene' },
  { id: 'dsl-contract', file: 'verify-dsl-contract', label: 'DSL 契约一致性', mode: 'contract' },
];

const CONCURRENCY = 4;
const mode = (process.argv[2] ?? 'all').toLowerCase();
if (!['all', 'doc', 'notes', 'hygiene', 'contract'].includes(mode)) {
  console.error(`未知模式：${mode}（可选 all|doc|notes|hygiene|contract）`);
  process.exit(2);
}

// 校验依赖图无环
const byId = new Map(GATES.map((g) => [g.id, g]));
for (const g of GATES) {
  for (const n of g.needs ?? []) {
    if (!byId.has(n)) {
      console.error(`依赖图有环或缺失：${g.id} 依赖未知 gate ${n}`);
      process.exit(2);
    }
  }
}

const selected = GATES.filter((g) => mode === 'all' || g.mode === mode);
const run = (g: Gate) =>
  new Promise<{ gate: Gate; ok: boolean; out: string }>((resolvePromise) => {
    const child = spawn('node', ['scripts/' + g.file + '.ts'], { cwd: repoRoot });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolvePromise({ gate: g, ok: code === 0, out }));
  });

// 拓扑执行：needs 先跑；每轮并发最多 CONCURRENCY 个 ready gate
const done = new Set<string>();
const failed = new Set<string>();
const results: Array<{ gate: Gate; ok: boolean; out: string }> = [];

while (true) {
  const ready = selected.filter(
    (g) => !done.has(g.id) && !failed.has(g.id) && (g.needs ?? []).every((n) => done.has(n))
  );
  if (ready.length === 0) break;
  const batch = await Promise.all(ready.slice(0, CONCURRENCY).map(run));
  for (const r of batch) {
    done.add(r.gate.id);
    results.push(r);
    if (!r.ok) failed.add(r.gate.id);
  }
}

for (const { gate, ok, out } of results) {
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${gate.id} — ${gate.label}`);
  if (!ok) console.log(out.trim().split('\n').map((l) => `    ${l}`).join('\n'));
}

const bad = results.filter((r) => !r.ok);
if (bad.length > 0) {
  console.error(`\n门禁未通过（${bad.length}/${results.length}）：${bad.map((b) => b.gate.id).join(', ')}`);
  process.exit(1);
}
console.log(`\n✓ run-gates（${mode}）：${results.length} 条门禁全绿`);
