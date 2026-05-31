// verify-file-hygiene 的非法/合法用例：缺尾换行与行尾空白必须变红（每个场景独立 fixture 根）。

import { cleanup, expectFail, expectPass, fixtureRoot, runGate, write } from './lib.ts';

// 非法 1：文件不以换行结尾
const bad1 = fixtureRoot();
try {
  write(bad1, 'src/a.ts', 'const a = 1;');
  expectFail('file-hygiene 拒绝缺尾换行', runGate('verify-file-hygiene', bad1));
} finally {
  cleanup(bad1);
}

// 非法 2：行尾空白
const bad2 = fixtureRoot();
try {
  write(bad2, 'src/b.ts', 'const b = 1;  \n');
  expectFail('file-hygiene 拒绝行尾空白', runGate('verify-file-hygiene', bad2));
} finally {
  cleanup(bad2);
}

// 合法：干净文件
const good = fixtureRoot();
try {
  write(good, 'src/c.ts', 'const c = 1;\n');
  expectPass('file-hygiene 放行干净文件', runGate('verify-file-hygiene', good));
} finally {
  cleanup(good);
}
