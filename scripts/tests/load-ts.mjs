import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = fileURLToPath(new URL('../../', import.meta.url));
const nativeRequire = createRequire(import.meta.url);
export function createTsLoader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    const absolute = resolve(root, file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const output = ts.transpileModule(readFileSync(absolute, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
    }).outputText;
    const require = (name) => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name === 'server-only') return {};
      if (name.startsWith('@/') || name.startsWith('.')) {
        const source = name.startsWith('@/')
          ? resolve(root, 'src', name.slice(2))
          : resolve(dirname(absolute), name);
        return name.endsWith('.json')
          ? nativeRequire(source)
          : load(
              existsSync(source + '.ts')
                ? source + '.ts'
                : resolve(source, 'index.ts'),
            );
      }
      return nativeRequire(name);
    };
    new Function('require', 'module', 'exports', output)(
      require,
      module,
      module.exports,
    );
    return module.exports;
  }
  return load;
}
