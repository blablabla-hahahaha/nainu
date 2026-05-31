// verify-agent-note-format 的非法/合法用例：缺 Alternatives、Status 与目录不符必须变红（每个场景独立 fixture 根）。

import { cleanup, expectFail, expectPass, fixtureRoot, runGate, write } from './lib.ts';

const base = '.agents/notes';

// 非法 1：缺 ## Alternatives considered
const bad1 = fixtureRoot();
try {
  write(
    bad1,
    `${base}/implemented/architecture/2025-08-29-bad-missing-alternatives.md`,
    '# Agent Note: 缺备选\n\nStatus: implemented\n\n## Problem\n\n动机。\n\n## Decision\n\n决定。\n\n## Consequences\n\n后果。\n'
  );
  expectFail('note-format 拒绝缺 Alternatives 的 note', runGate('verify-agent-note-format', bad1));
} finally {
  cleanup(bad1);
}

// 非法 2：Status 与生命周期目录不符
const bad2 = fixtureRoot();
try {
  write(
    bad2,
    `${base}/proposed/architecture/2025-08-29-bad-status.md`,
    '# Agent Note: 状态不符\n\nStatus: implemented\n\n## Problem\n\n动机。\n\n## Proposal\n\n方案。\n\n## Alternatives considered\n\n备选。\n\n## Acceptance criteria\n\n完成态。\n\n## Risks\n\n风险。\n'
  );
  expectFail('note-format 拒绝 Status 与目录不符', runGate('verify-agent-note-format', bad2));
} finally {
  cleanup(bad2);
}

// 合法：完整 implemented note
const good = fixtureRoot();
try {
  write(
    good,
    `${base}/implemented/architecture/2025-08-29-good-note.md`,
    '# Agent Note: 合法示例\n\nStatus: implemented\n\n## Problem\n\n动机。\n\n## Decision\n\n决定。\n\n## Alternatives considered\n\n备选与落选原因。\n\n## Consequences\n\n后果。\n'
  );
  expectPass('note-format 放行合法 note', runGate('verify-agent-note-format', good));
} finally {
  cleanup(good);
}
