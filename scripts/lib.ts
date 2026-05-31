// 门禁共享工具：路径/读取/词数/锚点计算。Node ≥ 23.6 原生执行（type stripping），零依赖。

import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** 仓库根：本文件位于 <root>/scripts/lib.ts。 */
export const repoRoot = resolve(new URL('..', import.meta.url).pathname);

/** 门禁扫描时忽略的目录名（相对任意扫描根）。 */
export const IGNORE_DIRS = new Set(['node_modules', '.git', '.gradle', 'build', 'dist', '.idea', '.DS_Store']);

/** 门禁扫描时忽略的路径段（相对仓库根）。 */
export const IGNORE_SEGMENTS = ['.agents/skills/nagi-vibe-coding'];

/** 递归收集某根下的相对路径（文件），按忽略规则裁剪。 */
export function walk(root: string, suffix?: string): string[] {
  const out: string[] = [];
  const seg = (p: string) => p.split(/[\\/]+/).join('/');
  const visit = (dir: string, rel: string) => {
    for (const name of readdirSync(dir)) {
      if (name === '.git' || name === 'node_modules') continue;
      const full = join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      if (IGNORE_SEGMENTS.some((s) => seg(r).startsWith(s))) continue;
      const st = lstatSync(full);
      if (st.isSymbolicLink()) continue; // 符号链接不重复扫描
      if (st.isDirectory()) {
        if (IGNORE_DIRS.has(name)) continue;
        visit(full, r);
      } else if (!suffix || name.endsWith(suffix)) {
        out.push(r);
      }
    }
  };
  visit(root, '');
  return out.sort();
}

export function readText(p: string): string {
  return readFileSync(p, 'utf8');
}

/** 词数口径：拉丁词按空白分词计 1；中文字符每个计 1（`AGENTS.md`=1，`验证脚本`=2）。 */
export function wordCount(text: string): number {
  let count = 0;
  for (const t of text.split(/\s+/)) {
    if (!t) continue;
    const cjk = (t.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) ?? []).length;
    count += cjk + (t.length > cjk ? 1 : 0);
  }
  return count;
}

/** GitHub 风格锚点：小写、去标点、空白转连字符。 */
export function githubAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\-_]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** 锚点匹配：全等计算锚点；或 ASCII-only fragment 命中标题中的某个 ASCII 词（如 `#conventions` 命中「约定（Conventions）」）。 */
export function anchorMatches(fragment: string, heading: string): boolean {
  const f = fragment.toLowerCase();
  if (f === githubAnchor(heading)) return true;
  const asciiWords = heading.match(/[A-Za-z0-9]+/g) ?? [];
  return asciiWords.some((w) => w.toLowerCase() === f);
}

/** 收集一个 md 文件的标题及其计算锚点。 */
export function headingsOf(text: string): Array<{ level: number; heading: string; anchor: string }> {
  const out: Array<{ level: number; heading: string; anchor: string }> = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m) out.push({ level: m[1].length, heading: m[2], anchor: githubAnchor(m[2]) });
  }
  return out;
}

export function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

/** 解析 `--root <dir>` 参数：门禁默认跑仓库根，spec 用 fixture 根覆盖。 */
export function argRoot(defaultRoot: string): string {
  const i = process.argv.indexOf('--root');
  if (i !== -1 && process.argv[i + 1]) return resolve(process.argv[i + 1]);
  return defaultRoot;
}
