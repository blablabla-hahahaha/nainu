// 门禁：Markdown 一段一行——段落不手动折行（代码块/表格/列表/引用不受限）。
// 配套非法用例：scripts/spec/md-wrap.spec.ts

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { argRoot, fail, repoRoot, walk } from './lib.ts';

const root = argRoot(repoRoot);

// 段落行：非空、非结构标记；连续段落行 >1 即违规
const STRUCT = /^(\s*(#{1,6}|\*|[-+]\s|\d+\.\s|>|\||```|<!--)|```$|\s*$)/;

let errors = 0;
const files = walk(root, '.md').filter((f) => !f.startsWith('.agents/skills/'));

for (const f of files) {
  const lines = readFileSync(join(root, f), 'utf8').split('\n');
  let inFence = false;
  let paraRun = 0;
  let paraStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      paraRun = 0;
      continue;
    }
    if (inFence) continue;
    if (STRUCT.test(line)) {
      if (paraRun > 1) {
        errors++;
        console.error(`✗ ${f}:${paraStart + 1}: 段落折行（一段应在一行，共 ${paraRun} 行）`);
      }
      paraRun = 0;
      continue;
    }
    if (paraRun === 0) paraStart = i;
    paraRun++;
  }
  if (paraRun > 1) {
    errors++;
    console.error(`✗ ${f}:${paraStart + 1}: 段落折行（一段应在一行，共 ${paraRun} 行）`);
  }
}

if (errors > 0) fail(`md-wrap：${errors} 处段落折行`);
console.log(`✓ verify-md-wrap：${files.length} 个 md 文件段落均一段一行`);
