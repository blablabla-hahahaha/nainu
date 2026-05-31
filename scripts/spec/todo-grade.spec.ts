// verify-todo-grade 的非法/合法用例：裸 TODO 必须变红，带说明的分级必须变绿。

import { cleanup, expectFail, expectPass, fixtureRoot, runGate, write } from './lib.ts';

const dir = fixtureRoot();
try {
  // 非法：裸 TODO（无说明）
  write(dir, 'src/code.ts', '// TODO\nconst a = 1;\n');
  const bad = runGate('verify-todo-grade', dir);
  expectFail('todo-grade 拒绝裸 TODO', bad);

  // 合法：带说明的分级
  write(
    dir,
    'src/code.ts',
    '// FIXME: 发版前必须修复重试退避\n// TODO(zhang): 尽快补单测\n// XXX: 可能永远不需要的优化\nconst a = 1;\n'
  );
  const good = runGate('verify-todo-grade', dir);
  expectPass('todo-grade 放行带说明分级', good);
} finally {
  cleanup(dir);
}
