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

test('动态入口和品牌旧地址一跳永久迁移，保留语言、查询参数和片段', () => {
  for (const language of ['en', 'zh', 'ja', 'vi', 'zh-hant']) {
    for (const [oldPath, newPath] of [['/live', '/live-wallpapers'], ['/live/', '/live-wallpapers'],
      ['/live/samsung', '/live-wallpapers/samsung'], ['/live/samsung/', '/live-wallpapers/samsung']]) {
      const response = middleware(new NextRequest(`https://phwalls.com/${language}${oldPath}?source=share#gallery`));
      assert.equal(response.status, 308);
      assert.equal(response.headers.get('location'), `https://phwalls.com/${language}${newPath}?source=share#gallery`);
    }
  }
});

test('静态资源与 API 的末尾斜杠继续永久规范化，已规范路径直接放行', () => {
  for (const path of ['/robots.txt', '/api/files/preview']) {
    const response = middleware(new NextRequest(`https://phwalls.com${path}/?key=test`));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), `https://phwalls.com${path}?key=test`);
    assert.equal(middleware(new NextRequest(`https://phwalls.com${path}?key=test`)).headers.get('location'), null);
  }
});

test('动态入口迁移与域名规范化合并为一次跳转', () => {
  const response = middleware(new NextRequest('https://www.phwalls.com/zh/live/samsung?source=share'));
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://phwalls.com/zh/live-wallpapers/samsung?source=share');
});

test('新动态入口正确重写，保留已有机型详情地址', () => {
  for (const path of ['/live-wallpapers', '/live-wallpapers/samsung', '/live/wallpapers/samsung/samsung-galaxy-s25']) {
    const response = middleware(new NextRequest(`https://phwalls.com/zh${path}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('x-middleware-rewrite'), `https://phwalls.com${path}`);
  }
});

test('无语言旧动态入口直接进入对应语言的新地址，保持临时语言重定向', () => {
  const response = middleware(new NextRequest('https://phwalls.com/live/samsung', {
    headers: { 'accept-language': 'ja' },
  }));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://phwalls.com/ja/live-wallpapers/samsung');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

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

test('重新打开旧的英文链接时恢复用户选择的语言', () => {
  const request = new NextRequest('https://phwalls.com/en/wallpapers', {
    headers: {
      'accept-language': 'en-US,en;q=0.9',
      cookie: 'phwalls-lang=zh; phwalls-lang-selected=1',
    },
  });

  const response = middleware(request);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://phwalls.com/zh/wallpapers');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
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

test('后台根路径进入 manager 并保留栏目参数', () => {
  const response = middleware(new NextRequest('https://a.phwalls.com/?tab=upload'));
  assert.equal(response.headers.get('location'), 'https://a.phwalls.com/manager?tab=upload');
});

test('manager 与管理 API 在后台域名直接放行', () => {
  for (const path of ['/manager?tab=wallpapers', '/api/admin/session']) {
    const response = middleware(new NextRequest(`https://a.phwalls.com${path}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(response.headers.get('location'), null);
  }
});

test('旧后台与带语言前缀的后台地址跳转 manager 并保留栏目', () => {
  for (const path of ['/admin', '/zh/admin', '/en/manager']) {
    const response = middleware(new NextRequest(`https://a.phwalls.com${path}?tab=i18n`));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), 'https://a.phwalls.com/manager?tab=i18n');
  }
});

test('公开域名不提供后台页面或 API', () => {
  for (const path of ['/admin', '/manager', '/zh/manager', '/en/admin', '/api/admin/session']) {
    assert.equal(middleware(new NextRequest(`https://phwalls.com${path}`)).status, 404);
  }
});

test('后台域名仍拒绝公开页面', () => {
  assert.equal(middleware(new NextRequest('https://a.phwalls.com/zh/about')).status, 404);
});

test('后台页面与 API 保留原有的末尾斜杠永久规范化', () => {
  for (const [path, canonical] of [['/manager/', '/manager'], ['/admin/', '/manager'],
    ['/zh/admin/', '/manager'], ['/api/admin/session/', '/api/admin/session']]) {
    const response = middleware(new NextRequest(`https://a.phwalls.com${path}?tab=upload`));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), `https://a.phwalls.com${canonical}?tab=upload`);
  }
});

test('后台静态资源的末尾斜杠继续规范化，同时拒绝公开页面', () => {
  for (const path of ['/favicon.ico', '/robots.txt']) {
    const response = middleware(new NextRequest(`https://a.phwalls.com${path}/`));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), `https://a.phwalls.com${path}`);
  }
  assert.equal(middleware(new NextRequest('https://a.phwalls.com/zh/live-wallpapers/')).status, 404);
});

test('开发环境允许 localhost 访问 manager', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const response = middleware(new NextRequest('http://localhost:3100/manager?tab=brands'));
    assert.equal(response.headers.get('x-middleware-next'), '1');
  } finally { process.env.NODE_ENV = previous; }
});
