// verify-md-links 的非法/合法用例：死链接与死锚点必须变红（每个场景独立 fixture 根）。

import { cleanup, expectFail, expectPass, fixtureRoot, runGate, write } from './lib.ts';

// 非法 1：链接到不存在的文件
const bad1 = fixtureRoot();
try {
  write(bad1, 'doc/bad-link.md', '[缺失](missing.md)\n');
  expectFail('md-links 拒绝死链接', runGate('verify-md-links', bad1));
} finally {
  cleanup(bad1);
}

// 非法 2：锚点不存在
const bad2 = fixtureRoot();
try {
  write(bad2, 'doc/target.md', '# 目标文档\n\n## 有个锚点\n\n正文。\n');
  write(bad2, 'doc/bad-anchor.md', '[错锚点](target.md#不存在的标题)\n');
  expectFail('md-links 拒绝死锚点', runGate('verify-md-links', bad2));
} finally {
  cleanup(bad2);
}

// 合法：存在目标 + 存在锚点 + 外部 URL
const good = fixtureRoot();
try {
  write(good, 'doc/target.md', '# 目标文档\n\n## 有个锚点\n\n正文。\n');
  write(good, 'doc/good.md', '[目标](target.md)\n\n[锚点](target.md#有个锚点)\n\n[外链](https://example.com)\n');
  expectPass('md-links 放行可达链接', runGate('verify-md-links', good));
} finally {
  cleanup(good);
}
