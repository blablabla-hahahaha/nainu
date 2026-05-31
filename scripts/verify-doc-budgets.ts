// 门禁：词数预算——常驻文档超限或缺失即失败（清单里有但文件缺失 = 失败，防止重命名悄悄孤立预算）。
// 配套非法用例：scripts/spec/doc-budgets.spec.ts
// 词数口径见 docs/AGENTS.md「词数预算」：拉丁词按空白分词计 1，中文字符每个计 1。

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { argRoot, fail, repoRoot, wordCount } from './lib.ts';

const root = argRoot(repoRoot);
const manifestPath = join(root, 'scripts', 'doc-budgets.manifest.json');

if (!existsSync(manifestPath)) {
  fail(`缺少预算清单 ${manifestPath}`);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { files: Record<string, { maxWords: number }> };

let errors = 0;
for (const [rel, { maxWords }] of Object.entries(manifest.files)) {
  const full = join(root, rel);
  if (!existsSync(full)) {
    errors++;
    console.error(`✗ 预算清单登记了 ${rel} 但文件缺失（重命名会悄悄孤立预算）`);
    continue;
  }
  const words = wordCount(readFileSync(full, 'utf8'));
  if (words > maxWords) {
    errors++;
    console.error(`✗ ${rel}: ${words} 词 > 预算 ${maxWords} 词（门禁变红时按序：搬迁 → 精简 → 才提高上限并在 PR 说明）`);
  }
}

if (errors > 0) fail(`doc-budgets：${errors} 处超限/缺失`);
console.log(`✓ verify-doc-budgets：${Object.keys(manifest.files).length} 个常驻文档均在预算内`);
