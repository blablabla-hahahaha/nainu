// 门禁：文件卫生——文件以恰好一个换行结尾、无行尾空白（含 \r）。
// 配套非法用例：scripts/spec/file-hygiene.spec.ts

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { argRoot, fail, repoRoot, walk } from './lib.ts';

const root = argRoot(repoRoot);

const TEXT_SUFFIX = ['.md', '.ts', '.tsx', '.js', '.jsx', '.java', '.kt', '.gradle', '.yml', '.yaml', '.json', '.properties', '.css', '.html', '.sh', '.gitignore', '.gitattributes'];
const files = walk(root).filter((f) => TEXT_SUFFIX.some((s) => f.endsWith(s)));

let errors = 0;

for (const f of files) {
  const full = join(root, f);
  const raw = readFileSync(full, 'utf8');
  if (raw.length === 0) continue; // 空文件（.gitkeep）豁免

  if (!raw.endsWith('\n')) {
    errors++;
    console.error(`✗ ${f}: 文件不以换行结尾`);
  } else if (raw.endsWith('\n\n')) {
    errors++;
    console.error(`✗ ${f}: 文件以多余空行结尾（应恰好一个换行）`);
  }

  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/[\t ]+$/.test(lines[i]) || /\r$/.test(lines[i])) {
      errors++;
      console.error(`✗ ${f}:${i + 1}: 行尾空白`);
      break; // 每文件报一次即可
    }
  }
}

if (errors > 0) fail(`file-hygiene：${errors} 处卫生问题`);
console.log(`✓ verify-file-hygiene：${files.length} 个文本文件卫生达标`);
