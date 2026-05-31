// verify-doc-budgets 的非法/合法用例：超限与清单登记但缺失必须变红。

import { cleanup, expectFail, expectPass, fixtureRoot, runGate, write } from './lib.ts';

const dir = fixtureRoot();
try {
  // 非法 1：超限
  write(dir, 'AGENTS.md', '# 标题\n\n这段文字远远超过两个词的预算限制所以必然变红。\n');
  write(dir, 'scripts/doc-budgets.manifest.json', JSON.stringify({ files: { 'AGENTS.md': { maxWords: 2 } } }, null, 2) + '\n');
  const bad1 = runGate('verify-doc-budgets', dir);
  expectFail('doc-budgets 拒绝超限文档', bad1);

  // 非法 2：清单登记但文件缺失
  write(dir, 'scripts/doc-budgets.manifest.json', JSON.stringify({ files: { 'vanished.md': { maxWords: 100 } } }, null, 2) + '\n');
  const bad2 = runGate('verify-doc-budgets', dir);
  expectFail('doc-budgets 拒绝清单孤立项', bad2);

  // 合法：预算内
  write(dir, 'AGENTS.md', '# 标题\n\n一句话正文。\n');
  write(dir, 'scripts/doc-budgets.manifest.json', JSON.stringify({ files: { 'AGENTS.md': { maxWords: 100 } } }, null, 2) + '\n');
  const good = runGate('verify-doc-budgets', dir);
  expectPass('doc-budgets 放行预算内文档', good);
} finally {
  cleanup(dir);
}
