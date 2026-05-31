// 门禁自检调度器：逐条运行 scripts/spec/*.spec.ts，证明每条门禁的非法用例会被拒绝。
// 用法：node scripts/run-specs.ts（或 npm run verify:spec）

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { repoRoot } from './lib.ts';

const specDir = join(repoRoot, 'scripts', 'spec');
const specs = readdirSync(specDir).filter((f) => f.endsWith('.spec.ts')).sort();

let failed = 0;
for (const s of specs) {
  process.stdout.write(`▶ ${s}\n`);
  const r = spawnSync('node', [join('scripts', 'spec', s)], { cwd: repoRoot, encoding: 'utf8' });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) failed++;
}

if (failed > 0) {
  console.error(`\n门禁自检未通过（${failed}/${specs.length}）`);
  process.exit(1);
}
console.log(`\n✓ run-specs：${specs.length} 条门禁的非法用例全部如预期被拒绝`);
