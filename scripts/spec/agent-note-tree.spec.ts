// agent-note-tree 的非法/合法用例：目录结构偏离封闭集合必须变红（每个场景独立 fixture 根）。

import { cleanup, expectFail, expectPass, fixtureRoot, runGate, write } from './lib.ts';

const note = (lifecycle: string, cat: string, name: string) => `# Agent Note: 示例\n\nStatus: ${lifecycle === 'proposed' ? 'proposed' : 'implemented'}\n\n## Problem\n\n动机。\n\n## ${lifecycle === 'proposed' ? 'Proposal' : 'Decision'}\n\n内容。\n\n## Alternatives considered\n\n备选。\n\n${lifecycle === 'proposed' ? '## Acceptance criteria\n\n完成态。\n\n## Risks\n\n风险。\n' : '## Consequences\n\n后果。\n'}`;

// 非法：非封闭集合的类别目录
const bad = fixtureRoot();
try {
  write(bad, '.agents/notes/implemented/refactor/2025-08-29-x.md', note('implemented', 'refactor', 'x'));
  expectFail('agent-note-tree 拒绝封闭集合外类别', runGate('agent-note-tree', bad));
} finally {
  cleanup(bad);
}

// 合法：完整封闭结构（四个生命周期 × 六类别）
const good = fixtureRoot();
try {
  for (const lc of ['proposed', 'implemented', 'rejected', 'archived']) {
    for (const cat of ['feature', 'bug-fix', 'simplification', 'architecture', 'process', 'testing']) {
      write(good, `.agents/notes/${lc}/${cat}/.gitkeep`, '');
    }
  }
  write(good, '.agents/notes/implemented/architecture/2025-08-29-x.md', note('implemented', 'architecture', 'x'));
  expectPass('agent-note-tree 放行封闭结构', runGate('agent-note-tree', good));
} finally {
  cleanup(good);
}
