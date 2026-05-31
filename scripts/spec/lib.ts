// spec 共享工具：fixture 根 + 写文件 + 以 --root 运行门禁 + 断言退出码。

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const repoRoot = resolve(new URL('../..', import.meta.url).pathname);

export function fixtureRoot(): string {
  return mkdtempSync(join(tmpdir(), 'nagi-gates-'));
}

export function write(dir: string, rel: string, content: string): void {
  const full = join(dir, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

export function runGate(file: string, root: string, ...extra: string[]): { status: number; out: string } {
  const r = spawnSync('node', ['scripts/' + file + '.ts', '--root', root, ...extra], { cwd: repoRoot, encoding: 'utf8' });
  return { status: r.status ?? -1, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

export function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/** 断言：非法用例必须让门禁失败（红 = 规则在起作用）。 */
export function expectFail(label: string, r: { status: number; out: string }): void {
  if (r.status === 0) {
    console.error(`✗ ${label}：非法用例居然通过了门禁\n${r.out}`);
    process.exit(1);
  }
  console.log(`✓ ${label}：门禁如预期拒绝（exit ${r.status}）`);
}

/** 断言：合法用例必须让门禁通过。 */
export function expectPass(label: string, r: { status: number; out: string }): void {
  if (r.status !== 0) {
    console.error(`✗ ${label}：合法用例被门禁误杀\n${r.out}`);
    process.exit(1);
  }
  console.log(`✓ ${label}：合法用例通过`);
}
