// 门禁：Markdown 相对链接不死链——链接目标必须存在、#fragment 锚点必须命中标题。
// 配套非法用例：scripts/spec/md-links.spec.ts
// 范围：全仓库 .md（含 .agents/skills/），跳过外部 URL、纯锚点、代码围栏内链接。

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { anchorMatches, argRoot, fail, headingsOf, repoRoot, walk } from './lib.ts';

const root = argRoot(repoRoot);

let errors = 0;
const files = walk(root, '.md');

const isExternal = (t: string) => /^(https?:\/\/|mailto:|tel:)/i.test(t) || t.startsWith('//');

for (const f of files) {
  const text = readFileSync(join(root, f), 'utf8');
  const localHeadings = headingsOf(text);
  const linkRe = /!?\[[^\]]*\]\(([^)]+)\)/g;
  let inFence = false;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    let m: RegExpExecArray | null;
    linkRe.lastIndex = 0;
    while ((m = linkRe.exec(line)) !== null) {
      const raw = m[1].trim();
      if (isExternal(raw)) continue;
      const [targetPart, fragment] = raw.split('#', 2);
      const target = targetPart.trim() || f; // 纯锚点 → 本文件

      if (fragment !== undefined && !fragment) {
        errors++;
        console.error(`✗ ${f}:${i + 1}: 空锚点 [${m[0]}]`);
        continue;
      }

      if (target === f) {
        // 同文件锚点：必须在本地标题中
        if (fragment && !localHeadings.some((h) => anchorMatches(fragment, h.heading))) {
          errors++;
          console.error(`✗ ${f}:${i + 1}: 死锚点 #${fragment}（本文件无匹配标题）`);
        }
        continue;
      }

      const abs = resolve(dirname(join(root, f)), target);
      if (!existsSync(abs)) {
        errors++;
        console.error(`✗ ${f}:${i + 1}: 死链接 [${m[0]}] → ${target}（文件不存在）`);
        continue;
      }
      if (fragment) {
        if (statSync(abs).isDirectory()) {
          errors++;
          console.error(`✗ ${f}:${i + 1}: 目录目标带锚点 #${fragment}（${target}）`);
          continue;
        }
        const headings = headingsOf(readFileSync(abs, 'utf8'));
        if (!headings.some((h) => anchorMatches(fragment, h.heading))) {
          errors++;
          console.error(`✗ ${f}:${i + 1}: 死锚点 [${m[0]}] → ${target}#${fragment}（无匹配标题）`);
        }
      }
    }
  }
}

if (errors > 0) fail(`md-links：${errors} 处死链/死锚点`);
console.log(`✓ verify-md-links：${files.length} 个 md 文件链接均可达`);
