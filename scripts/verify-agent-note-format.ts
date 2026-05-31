// 门禁：Agent Note 骨架校验——头部块、Status 与生命周期一致、强制章节、章节顺序、spec-speak 禁令。
// 配套非法用例：scripts/spec/agent-note-format.spec.ts

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { argRoot, fail, repoRoot } from './lib.ts';
import { CATEGORIES, LIFECYCLES } from './agent-note-tree.ts';

const root = argRoot(repoRoot);
const notesDir = join(root, '.agents', 'notes');

type Fix = { file: string; lines: string[] };

const notes: Fix[] = [];
for (const lc of LIFECYCLES) {
  for (const cat of CATEGORIES) {
    const dir = join(notesDir, lc, cat);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (name === '.gitkeep' || !name.endsWith('.md')) continue;
      notes.push({ file: join(lc, cat, name), lines: readFileSync(join(dir, name), 'utf8').split('\n') });
    }
  }
}

let errors = 0;
const err = (file: string, msg: string) => {
  errors++;
  console.error(`✗ ${file}: ${msg}`);
};

for (const { file, lines } of notes) {
  const rel = file.split('/');
  const lc = rel[0] as string;
  const cat = rel[1] as string;
  const name = rel[2] as string;

  // 命名：yyyy-mm-dd-标题.md
  if (!/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(name)) {
    err(file, `文件名必须是 yyyy-mm-dd-标题.md：${name}`);
  }

  // 头部块：前三行严格
  if (!/^# Agent Note: .+$/.test(lines[0] ?? '')) err(file, `第 1 行必须是 "# Agent Note: <title>"`);
  if ((lines[1] ?? '') !== '') err(file, `第 2 行必须为空行`);
  const statusLine = lines[2] ?? '';
  const statusM = statusLine.match(/^Status: (proposed|implemented|rejected — .+)$/);
  if (!statusM) err(file, `第 3 行必须是 "Status: proposed|implemented|rejected — <一句话原因>"`);

  if (statusM) {
    const st = statusM[1].startsWith('rejected') ? 'rejected' : statusM[1];
    if (st !== lc) err(file, `Status 与生命周期目录不一致：Status=${st} 目录=${lc}`);
  }

  const text = lines.join('\n');
  const has = (h: string) => text.includes(`## ${h}`);
  const idxOf = (h: string) => text.indexOf(`## ${h}`);

  if (!has('Problem')) err(file, `缺少 "## Problem"`);
  if (!has('Alternatives considered')) err(file, `缺少 "## Alternatives considered"（强制：记录了决策却没记录它击败了什么，等于邀请重新争论）`);

  if (lc === 'proposed') {
    for (const h of ['Proposal', 'Acceptance criteria', 'Risks']) {
      if (!has(h)) err(file, `proposed note 缺少 "## ${h}"`);
    }
    const order = ['Problem', 'Proposal', 'Alternatives considered', 'Acceptance criteria', 'Risks'];
    for (let i = 0; i < order.length - 1; i++) {
      if (idxOf(order[i]) !== -1 && idxOf(order[i + 1]) !== -1 && idxOf(order[i]) > idxOf(order[i + 1])) {
        err(file, `章节顺序错误："## ${order[i]}" 应在 "## ${order[i + 1]}" 之前`);
      }
    }
  } else if (lc === 'implemented') {
    for (const h of ['Decision', 'Consequences']) {
      if (!has(h)) err(file, `implemented note 缺少 "## ${h}"`);
    }
    const order = ['Problem', 'Decision', 'Alternatives considered', 'Consequences'];
    for (let i = 0; i < order.length - 1; i++) {
      if (idxOf(order[i]) !== -1 && idxOf(order[i + 1]) !== -1 && idxOf(order[i]) > idxOf(order[i + 1])) {
        err(file, `章节顺序错误："## ${order[i]}" 应在 "## ${order[i + 1]}" 之前`);
      }
    }
    // spec-speak 禁令
    for (const h of ['Proposal', 'Plan', 'Migration plan', 'Acceptance criteria']) {
      if (has(h)) err(file, `implemented note 禁止 "## ${h}"（spec-speak，描述「是什么」而非「要做什么」）`);
    }
  } else if (lc === 'rejected') {
    if (!has('Proposal')) err(file, `rejected note 缺少 "## Proposal"`);
  }

  // 类别目录校验
  if (!(CATEGORIES as readonly string[]).includes(cat)) {
    err(file, `类别目录不在封闭集合内：${cat}`);
  }
}

if (notes.length === 0) {
  console.log(`✓ verify-agent-note-format：.agents/notes/ 下暂无 note（模板见 .agents/notes/templates/）`);
} else if (errors > 0) {
  fail(`Agent Note 骨架不合法（${errors} 处问题，共 ${notes.length} 份 note）`);
} else {
  console.log(`✓ verify-agent-note-format：${notes.length} 份 note 骨架合法`);
}
