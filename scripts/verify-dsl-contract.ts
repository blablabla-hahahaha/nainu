/**
 * 门禁：DSL 契约一致性。
 * (1) TS 生成新鲜度——schema 变更未同步生成 web/src/generated/workflow-dsl.ts 即失败；
 * (2) 仓库 DSL 样例过 JSON Schema 结构校验（ajv，经 web/scripts/validate-dsl.mjs）；
 * (3) 仓库 DSL 样例过图级规则（scripts/dsl-graph-rules.ts）。
 *
 * 配套非法用例：scripts/spec/dsl-contract.spec.ts。
 * 依赖 web/node_modules（ajv / json-schema-to-typescript）；root 保持零依赖。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { argRoot, fail, repoRoot } from './lib.ts';
import { validateGraph } from './dsl-graph-rules.ts';

const root = argRoot(repoRoot);
let errors = 0;

// (1) 生成新鲜度
const genScript = join(repoRoot, 'web', 'scripts', 'gen-dsl.mjs');
if (existsSync(genScript)) {
    const r = spawnSync('node', ['web/scripts/gen-dsl.mjs', '--check'], { cwd: repoRoot, encoding: 'utf8' });
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.status !== 0) errors++;
} else {
    console.log('（跳过生成新鲜度检查：web/scripts/gen-dsl.mjs 不存在）');
}

// (2)(3) 仓库 DSL 样例
const validateScript = join(repoRoot, 'web', 'scripts', 'validate-dsl.mjs');
const samples = [
    join(root, 'nainu-agi-master', 'src', 'main', 'resources', 'workflow-demo.json'),
];
for (const sample of samples) {
    if (!existsSync(sample)) {
        console.log(`（跳过样例检查：${sample} 不存在）`);
        continue;
    }
    const dsl = JSON.parse(readFileSync(sample, 'utf8'));
    const graphErrors = validateGraph(dsl);
    if (graphErrors.length > 0) {
        errors++;
        console.error(`✗ 图级规则未通过：${sample}`);
        for (const e of graphErrors) console.error(`   - ${e}`);
    }
    if (existsSync(validateScript)) {
        const r = spawnSync('node', ['web/scripts/validate-dsl.mjs', sample], { cwd: repoRoot, encoding: 'utf8' });
        if (r.stdout) process.stdout.write(r.stdout);
        if (r.status !== 0) errors++;
    }
}

if (errors > 0) fail(`dsl-contract：${errors} 处不一致`);
console.log('✓ verify-dsl-contract：生成新鲜度 + 样例结构/图级规则全部通过');
