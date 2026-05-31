/**
 * 用 ajv 校验 DSL JSON 文件是否符合 workflow-dsl.schema.json（2020-12）。
 * 用法：node scripts/validate-dsl.mjs <dsl.json>
 * 供 verify-dsl-contract 门禁与人工校验使用。
 */
import Ajv2020 from 'ajv/dist/2020.js';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const schema_path = resolve(here, '../../nainu-agi-common/src/main/resources/dsl/workflow-dsl.schema.json');
const target = process.argv[2];

if (!target) {
    console.error('用法：node scripts/validate-dsl.mjs <dsl.json>');
    process.exit(2);
}

const schema = JSON.parse(await readFile(schema_path, 'utf8'));
const dsl = JSON.parse(await readFile(resolve(target), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

if (validate(dsl)) {
    console.log(`✓ ${target} 通过 workflow-dsl schema 校验`);
    process.exit(0);
}

console.error(`✗ ${target} 未通过 schema 校验：`);
for (const e of validate.errors ?? []) {
    console.error(`   - ${e.instancePath || '/'} ${e.message}`);
}
process.exit(1);
