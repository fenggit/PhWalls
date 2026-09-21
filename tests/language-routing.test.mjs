import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/server') {
      return nextResolve('next/server.js', context);
    }

    if (specifier.startsWith('@/')) {
      const relativePath = specifier.slice(2);
      const resolvedPath = relativePath === 'types'
        ? 'types/index.ts'
        : `${relativePath}${relativePath.endsWith('.json') ? '' : '.ts'}`;
      return {
        url: new URL(`../src/${resolvedPath}`, import.meta.url).href,
        shortCircuit: true,
      };
    }

    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const json = readFileSync(fileURLToPath(url), 'utf8');
      return {
        format: 'module',
        source: `export default ${json};`,
        shortCircuit: true,
      };
    }

    return nextLoad(url, context);
  },
});

const { NextRequest } = await import('next/server.js');
const { resolveRequestLanguage } = await import('../src/lib/language.ts');
const { middleware } = await import('../src/middleware.ts');

test('用户选择的语言优先于浏览器语言', () => {
  assert.equal(
    resolveRequestLanguage({ cookieLang: 'zh', browserLang: 'en' }),
    'zh'
  );
});

test('没有用户选择时使用浏览器语言', () => {
  assert.equal(resolveRequestLanguage({ browserLang: 'ja' }), 'ja');
});

test('中间件优先使用用户选择的语言 Cookie', () => {
  const request = new NextRequest('https://phwalls.com/', {
    headers: {
      'accept-language': 'en-US,en;q=0.9',
      cookie: 'phwalls-lang=vi; phwalls-lang-selected=1',
    },
  });

  const response = middleware(request);

  assert.equal(response.headers.get('location'), 'https://phwalls.com/vi');
});

test('IP 国家信息不参与语言解析', () => {
  assert.equal(resolveRequestLanguage({ country: 'JP' }), 'en');
});

test('自动语言跳转使用临时重定向', () => {
  const request = new NextRequest('https://phwalls.com/', {
    headers: { 'accept-language': 'zh-CN,zh;q=0.9' },
  });

  const response = middleware(request);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://phwalls.com/zh');
});

test('自动语言跳转禁止缓存', () => {
  const request = new NextRequest('https://phwalls.com/', {
    headers: { 'accept-language': 'zh-CN,zh;q=0.9' },
  });

  const response = middleware(request);

  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('显式语言路径的规范域名跳转仍使用永久重定向', () => {
  const request = new NextRequest('https://www.phwalls.com/zh');

  const response = middleware(request);

  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://phwalls.com/zh');
});
