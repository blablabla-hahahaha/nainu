/**
 * 从 common 的 workflow-dsl.schema.json 生成 TS 类型（web/src/generated/workflow-dsl.ts）。
 * 用法：node scripts/gen-dsl.mjs [--check]
 *   --check 只比对不写入，不一致退出码 1（供 verify-dsl-contract 门禁调用）。
 */
import { compile } from 'json-schema-to-typescript';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const schema_path = resolve(here, '../../nainu-agi-common/src/main/resources/dsl/workflow-dsl.schema.json');
const out_path = resolve(here, '../src/generated/workflow-dsl.ts');
const check = process.argv.includes('--check');

const schema = JSON.parse(await readFile(schema_path, 'utf8'));
const ts = await compile(schema, 'WorkflowGraph', {
    bannerComment:
        '// 本文件由 web/scripts/gen-dsl.mjs 从 nainu-agi-common/src/main/resources/dsl/workflow-dsl.schema.json 生成——请勿手改。',
    additionalProperties: false,
});

if (check) {
    const existing = await readFile(out_path, 'utf8').catch(() => null);
    if (existing !== ts) {
        console.error('✗ web/src/generated/workflow-dsl.ts 与 schema 不一致，请运行 npm run gen:dsl 重新生成');
        process.exit(1);
    }
    console.log('✓ workflow-dsl.ts 与 schema 一致');
} else {
    await mkdir(dirname(out_path), { recursive: true });
    await writeFile(out_path, ts);
    console.log(`✓ 已生成 ${out_path}`);
}
