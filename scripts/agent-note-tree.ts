// 结构真源：Agent Notes 的封闭生命周期/类别集合 + 目录结构校验。
// 本文件同时是「封闭集合」的真源与门禁实现；改集合必须同步改 .agents/notes/README.md 的分类表。
// 被 verify-agent-note-format / verify-archived-agent-notes import 时无副作用；
// 作为入口（node scripts/agent-note-tree.ts）运行时执行目录结构校验。

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { argRoot, fail, repoRoot } from './lib.ts';

export const LIFECYCLES = ['proposed', 'implemented', 'rejected'] as const;
export const CATEGORIES = ['feature', 'bug-fix', 'simplification', 'architecture', 'process', 'testing'] as const;
export const ARCHIVE = 'archived';

function validateTree(root: string): void {
  const notesDir = join(root, '.agents', 'notes');
  let errors = 0;
  const check = (ok: boolean, msg: string) => {
    if (!ok) {
      errors++;
      console.error(`✗ ${msg}`);
    }
  };

  if (!existsSync(notesDir)) {
    fail(`缺少 .agents/notes/ 目录：${notesDir}`);
  }

  for (const lc of LIFECYCLES) {
    for (const cat of CATEGORIES) {
      check(existsSync(join(notesDir, lc, cat)), `缺失目录 .agents/notes/${lc}/${cat}/`);
    }
  }
  for (const cat of CATEGORIES) {
    check(existsSync(join(notesDir, ARCHIVE, cat)), `缺失目录 .agents/notes/${ARCHIVE}/${cat}/`);
  }

  // 生命周期/类别之外的顶层与二级目录都不允许（templates/ 除外）。
  for (const top of readdirSync(notesDir)) {
    const topPath = join(notesDir, top);
    if (!statSync(topPath).isDirectory()) continue;
    if (top === 'templates') continue;
    if (![...LIFECYCLES, ARCHIVE].includes(top)) {
      check(false, `非法生命周期目录 .agents/notes/${top}/（封闭集合：${[...LIFECYCLES, ARCHIVE].join(' / ')}）`);
      continue;
    }
    for (const sub of readdirSync(topPath)) {
      if (sub === '.gitkeep') continue;
      if (!statSync(join(topPath, sub)).isDirectory()) continue;
      if (!(CATEGORIES as readonly string[]).includes(sub)) {
        check(false, `非法类别目录 .agents/notes/${top}/${sub}/（封闭集合：${CATEGORIES.join(' / ')}）`);
      }
    }
  }

  if (errors > 0) fail(`Agent Notes 目录结构不合法（${errors} 处）`);
  console.log(`✓ agent-note-tree：目录结构与封闭集合一致（lifecycles=${LIFECYCLES.length} categories=${CATEGORIES.length}）`);
}

if (import.meta.main) {
  validateTree(argRoot(repoRoot));
}
