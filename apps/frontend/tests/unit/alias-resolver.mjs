import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sourceRoot = `${resolve(dirname(fileURLToPath(import.meta.url)), '../../src')}/`;
const EXTENSIONS = ['', '.ts', '.tsx', '.js'];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith('@/')) return nextResolve(specifier, context);

    const base = resolve(sourceRoot, specifier.slice('@/'.length));
    const found = EXTENSIONS.map((extension) => `${base}${extension}`).find(
      (candidate) => existsSync(candidate),
    );
    if (!found) throw new Error(`Cannot resolve ${specifier} under ${sourceRoot}`);

    return { url: pathToFileURL(found).href, shortCircuit: true };
  },
});
