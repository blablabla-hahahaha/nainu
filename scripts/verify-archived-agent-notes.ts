// 门禁：归档 Agent Note 冻结校验——归档元数据（Status/Archived 行）+ 内容哈希 manifest，append-only 冻结。
// 配套非法用例：scripts/spec/archived-notes.spec.ts
// 归档操作：node scripts/verify-archived-agent-notes.ts --write（重录哈希；只允许内容变更后的归档动作）

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { argRoot, fail, repoRoot } from './lib.ts';
import { CATEGORIES } from './agent-note-tree.ts';

const root = argRoot(repoRoot);
const notesDir = join(root, '.agents', 'notes');
const manifestPath = join(root, 'scripts', 'archived-manifest.json');
const writeMode = process.argv.includes('--write');

const rel = (p: string) => p.split(/[\\/]+/).join('/');

const archived: string[] = [];
for (const cat of CATEGORIES) {
  const dir = join(notesDir, 'archived', cat);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    if (name === '.gitkeep' || !name.endsWith('.md')) continue;
    archived.push(join('archived', cat, name));
  }
}

let manifest: Record<string, string> = {};
if (existsSync(manifestPath)) {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
}

let errors = 0;
const err = (m: string) => {
  errors++;
  console.error(`✗ ${m}`);
};

for (const f of archived) {
  const full = join(notesDir, f);
  const text = readFileSync(full, 'utf8');
  const lines = text.split('\n');

  if (!/^Status: implemented$/.test(lines[2] ?? '')) {
    err(`${f}: 归档 note 第 3 行必须是 "Status: implemented"`);
  }
  const archivedLine = lines.find((l) => /^Archived: \d{4}-\d{2}-\d{2}$/.test(l));
  if (!archivedLine) {
    err(`${f}: 缺少 "Archived: YYYY-MM-DD" 行`);
  }

  const hash = createHash('sha256').update(text, 'utf8').digest('hex');
  const key = rel(f);
  if (writeMode) {
    manifest[key] = hash;
  } else if (manifest[key] === undefined) {
    err(`${f}: 未在 archived-manifest.json 登记（归档后需运行 --write 重录哈希）`);
  } else if (manifest[key] !== hash) {
    err(`${f}: 内容哈希与 manifest 不符——归档记录已冻结，禁止编辑/更新`);
  }
}

// manifest 里登记了但文件已不在 = 非法删除（append-only 冻结）
for (const key of Object.keys(manifest)) {
  if (!archived.includes(key)) {
    err(`${key}: manifest 已登记但文件缺失——归档记录永久冻结，禁止删除`);
  }
}

if (writeMode) {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`✓ verify-archived-agent-notes：已重录 manifest（${Object.keys(manifest).length} 份归档）`);
} else if (errors > 0) {
  fail(`归档 Agent Note 冻结校验失败（${errors} 处问题）`);
} else {
  console.log(`✓ verify-archived-agent-notes：${archived.length} 份归档冻结内容一致`);
}
