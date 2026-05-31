// verify-md-wrap 的非法/合法用例：段落折行必须变红，一段一行必须变绿（每个场景独立 fixture 根）。

import { cleanup, expectFail, expectPass, fixtureRoot, runGate, write } from './lib.ts';

// 非法：段落折成两行
const badDir = fixtureRoot();
try {
  write(badDir, 'doc/bad.md', '# 标题\n\n这是第一行。\n这是第二行（折行违规）。\n');
  expectFail('md-wrap 拒绝折行段落', runGate('verify-md-wrap', badDir));
} finally {
  cleanup(badDir);
}

// 合法：一段一行 + 列表 + 代码围栏
const goodDir = fixtureRoot();
try {
  write(
    goodDir,
    'doc/good.md',
    '# 标题\n\n这是一段，在一行内结束。\n\n- 列表项一\n- 列表项二\n\n```ts\nconst a = 1;\nconst b = 2;\n```\n'
  );
  expectPass('md-wrap 放行一段一行', runGate('verify-md-wrap', goodDir));
} finally {
  cleanup(goodDir);
}
