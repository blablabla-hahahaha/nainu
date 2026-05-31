// verify-archived-agent-notes 的非法/合法用例：缺 Archived 行、内容被篡改必须变红。

import { cleanup, expectFail, expectPass, fixtureRoot, runGate, write } from './lib.ts';

const dir = fixtureRoot();
const note = '.agents/notes/archived/architecture/2025-01-01-frozen.md';
try {
  // 非法 1：归档 note 缺 Archived 行
  write(
    dir,
    note,
    '# Agent Note: 冻结示例\n\nStatus: implemented\n\n## Problem\n\n动机。\n\n## Decision\n\n决定。\n\n## Alternatives considered\n\n备选。\n\n## Consequences\n\n后果。\n'
  );
  const bad1 = runGate('verify-archived-agent-notes', dir);
  expectFail('archived-notes 拒绝缺 Archived 行的归档', bad1);

  // 非法 2：内容被篡改（manifest 哈希不符）
  write(
    dir,
    note,
    '# Agent Note: 冻结示例\n\nStatus: implemented\n\nArchived: 2025-01-02\n\n## Problem\n\n动机。\n\n## Decision\n\n决定。\n\n## Alternatives considered\n\n备选。\n\n## Consequences\n\n后果。\n'
  );
  write(dir, 'scripts/archived-manifest.json', JSON.stringify({ 'archived/architecture/2025-01-01-frozen.md': 'deadbeef' }, null, 2) + '\n');
  const bad2 = runGate('verify-archived-agent-notes', dir);
  expectFail('archived-notes 拒绝被篡改内容', bad2);

  // 合法：--write 登记（重录哈希）后校验通过
  const writeRes = runGate('verify-archived-agent-notes', dir, '--write');
  expectPass('archived-notes --write 重录', writeRes);
  const ok = runGate('verify-archived-agent-notes', dir);
  expectPass('archived-notes 重录后校验通过', ok);
} finally {
  cleanup(dir);
}
