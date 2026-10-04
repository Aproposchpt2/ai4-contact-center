import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const files = readdirSync('tests', { recursive: true })
  .filter((f) => f.endsWith('.test.mts'))
  .map((f) => join('tests', f));

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
