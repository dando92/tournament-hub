import { cpSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const source = join(dirname(require.resolve('flag-icons/package.json')), 'flags', '4x3');
const target = fileURLToPath(new URL('../public/flags/', import.meta.url));

mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

console.log(`Copied country flags into ${target}`);
