// 门禁：TODO 标记分级——只允许 FIXME / TODO / XXX 三种，且必须带说明（禁止裸标记）。
// 分级语义：FIXME（发版阻塞）> TODO（尽快）> XXX（可能永远不）。
// 配套非法用例：scripts/spec/todo-grade.spec.ts

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { argRoot, fail, repoRoot, walk } from './lib.ts';

const root = argRoot(repoRoot);

const CODE_SUFFIX = ['.ts', '.tsx', '.js', '.jsx', '.java', '.kt', '.gradle', '.yml', '.yaml', '.properties', '.css', '.sh'];
const files = walk(root).filter((f) => CODE_SUFFIX.some((s) => f.endsWith(s)));

const tagRe = /\b(FIXME|TODO|XXX)\b/g;
const bareRe = /^(?:\([^)]*\))?\s*[:：\-]?\s*$/; // 标记后只剩 owner 括号/冒号/空白 → 裸

let errors = 0;

for (const f of files) {
  const lines = readFileSync(join(root, f), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const comment = line.split('//')[1] ?? line; // 简化：取 // 之后（含行尾注释）或整行
    let m: RegExpExecArray | null;
    tagRe.lastIndex = 0;
    while ((m = tagRe.exec(comment)) !== null) {
      const rest = comment.slice(m.index + m[0].length);
      if (bareRe.test(rest)) {
        errors++;
        console.error(`✗ ${f}:${i + 1}: 裸 ${m[0]} 无分级说明（格式：${m[0]}(owner): 一句话）`);
      }
    }
  }
}

if (errors > 0) fail(`todo-grade：${errors} 处裸 TODO 标记`);
console.log(`✓ verify-todo-grade：${files.length} 个代码文件无裸 TODO 标记`);
