import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/app/manager/AdminConsole.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('AdminConsole.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'AdminConsole');
const stateNames = component.body.statements.filter(ts.isVariableStatement).flatMap((statement) =>
  statement.declarationList.declarations.filter((declaration) => ts.isArrayBindingPattern(declaration.name) &&
    ts.isCallExpression(declaration.initializer) && declaration.initializer.expression.getText(parsed) === 'useState')
    .map((declaration) => declaration.name.elements[0].name.text));

function fixture({ sourceType = 'default', rows = true, failUpload = false } = {}) {
  const device = { id: 'mate-xt-2', brand_name: 'huawei', device_name: 'Huawei Mate XT 2',
    device_category: 'phone_fold', release_date: '2026/10/10', status: 'published' };
  const prefix = 'live/huawei/Huawei Mate XT 2';
  const states = new Map(Object.entries({ authenticated: true,
    brands: [{ slug: 'huawei', title: 'Huawei', kind: 'mobile' }], uploadBrand: 'huawei', uploadDevices: [device],
    uploadDevice: device.id, uploadMedia: 'dynamic', uploadFolderName: device.device_name, uploadFolderState: 'matched',
    uploadDirectory: { deviceId: device.id, media: 'dynamic', data: { prefix, directories: sourceType === 'default' ? [] : [prefix], source: sourceType } },
    uploadRows: rows ? [{ id: 'live', name: 'live', origin: { name: 'live.mp4', type: 'video/mp4', size: 100 },
      preview: { name: 'live.webp', type: 'image/webp', size: 100 }, folderName: device.device_name,
      theme: 'normal', tags: '', category: '', state: 'ready', progress: 0 }] : [],
  }));
  const refs = [];
  const requests = [];
  let stateIndex = 0;
  let refIndex = 0;
  let resolveIdle;
  const idle = () => new Promise((resolve) => { resolveIdle = resolve; });
  const hooks = {
    useState(initial) {
      const name = stateNames[stateIndex++];
      if (!states.has(name)) states.set(name, typeof initial === 'function' ? initial() : initial);
      return [states.get(name), (next) => {
        states.set(name, typeof next === 'function' ? next(states.get(name)) : next);
        if (name === 'busy' && next === false) resolveIdle?.();
      }];
    },
    useRef(initial) { const index = refIndex++; return refs[index] ||= { current: initial }; },
    useEffect() {}, useCallback: (callback) => callback,
  };
  const modules = new Map();
  function load(relative) {
    if (modules.has(relative)) return modules.get(relative).exports;
    const module = { exports: {} };
    modules.set(relative, module);
    const content = readFileSync(new URL(`../src/${relative}`, import.meta.url), 'utf8');
    runInNewContext(ts.transpileModule(content, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText, {
      module, exports: module.exports, URL, URLSearchParams, process: { env: {} },
      window: { confirm: () => assert.fail('Existing devices must not be recreated') },
      XMLHttpRequest: class {
        upload = {};
        status = 200;
        open() {} setRequestHeader() {}
        send(file) { if (typeof failUpload === 'function' ? failUpload(file) : failUpload) this.onerror(); else this.onload(); }
      },
      async fetch(path, options) {
        const body = options.body ? JSON.parse(options.body) : null;
        requests.push({ path, method: options.method, body });
        let result;
        if (path === '/api/admin/upload') {
          result = body.action === 'authorize' ? { url: 'https://uploads.example/file', token: body.role }
            : { data: { id: 'wallpaper', is_primary: 1 } };
        } else if (path === '/api/admin/devices' && options.method === 'POST') {
          assert.fail('First Live collection must reuse the existing static device');
        } else result = { data: path.includes('devices') ? [device] : [], total: 0, page: 0 };
        return { ok: true, json: async () => result };
      },
      require(specifier) {
        if (specifier === 'react') return hooks;
        if (specifier === 'next/navigation') return { useSearchParams: () => new URLSearchParams('tab=upload') };
        if (specifier === '@/app/manager/AdminDeviceI18nPanel') return { default: () => null };
        if (specifier === '@/lib/language') return { SUPPORTED_LANGUAGES: ['en', 'zh', 'ja', 'vi', 'zh-hant'] };
        if (specifier === '@/lib/data') return { buildWallpaperListTitle: () => '' };
        if (specifier === '@/lib/wallpaper-data') return { slugifyWallpaperName: () => '' };
        if (specifier.startsWith('@/')) return load(`${specifier.slice(2)}.ts`);
        return require(specifier);
      },
    });
    return module.exports;
  }
  const render = () => {
    stateIndex = refIndex = 0;
    return load('app/manager/AdminConsole.tsx').default();
  };
  return { states, requests, render, idle, setFailure: (value) => { failUpload = value; } };
}

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}
function label(node) {
  if (Array.isArray(node)) return node.map(label).join('');
  return typeof node === 'string' ? node : label(node?.props?.children || []);
}
function button(tree, text) { return nodes(tree).find((node) => node.type === 'button' && label(node) === text); }

test('a matched folder can create its first Live collection and offer publication without recreating the device', async () => {
  const app = fixture();
  const create = button(app.render(), '创建动态合集');
  assert.ok(create, 'The first Live collection needs an actionable create button');
  assert.equal(create.props.disabled, false);
  const done = app.idle();
  create.props.onClick();
  await done;
  assert.equal(app.states.get('uploadRows')[0].state, 'done');
  assert.equal(app.states.get('uploadPublication').device.id, 'mate-xt-2');
  assert.equal(app.states.get('uploadPublication').count, 1);
  assert.equal(app.requests.filter((request) => request.body?.action === 'complete').length, 1);
  assert.equal(app.requests.find((request) => request.body?.action === 'authorize').body.r2_prefix, 'live/huawei/Huawei Mate XT 2');
});

test('creation without files explains the next step and never uploads an empty collection', async () => {
  const app = fixture({ rows: false });
  const create = button(app.render(), '创建动态合集');
  assert.ok(create);
  const done = app.idle();
  create.props.onClick();
  await done;
  assert.match(app.states.get('error'), /文件/);
  assert.equal(app.requests.some((request) => request.path === '/api/admin/upload'), false);
  assert.equal(app.states.get('uploadPublication'), null);
});

test('existing collection uploads keep the matched-folder device lock', () => {
  const app = fixture({ sourceType: 'existing' });
  assert.equal(button(app.render(), '新增设备/系统').props.disabled, true);
});

test('a failed first upload keeps the publication offer available when retried', async () => {
  const app = fixture({ failUpload: true });
  const create = button(app.render(), '创建动态合集');
  assert.ok(create);
  let done = app.idle();
  create.props.onClick();
  await done;
  assert.equal(app.states.get('uploadPublication'), null);
  app.setFailure(false);
  done = app.idle();
  button(app.render(), '开始上传 (1)').props.onClick();
  await done;
  assert.equal(app.states.get('uploadPublication').count, 1);
});

test('partial creation uploads only failed files on retry and still offers publication for the full collection', async () => {
  const app = fixture({ failUpload: (file) => file.name === 'second.mp4' });
  const first = app.states.get('uploadRows')[0];
  app.states.set('uploadRows', [first, { ...first, id: 'second', name: 'second',
    origin: { ...first.origin, name: 'second.mp4' }, preview: { ...first.preview, name: 'second.webp' } }]);
  let done = app.idle();
  button(app.render(), '创建动态合集').props.onClick();
  await done;
  assert.deepEqual(app.states.get('uploadRows').map((row) => row.state), ['done', 'failed']);
  assert.equal(app.states.get('uploadPublication'), null);
  const directory = app.states.get('uploadDirectory');
  app.states.set('uploadDirectory', { ...directory, data: { ...directory.data, source: 'existing', directories: [directory.data.prefix] } });
  app.setFailure(false);
  done = app.idle();
  button(app.render(), '开始上传 (1)').props.onClick();
  await done;
  assert.equal(app.states.get('uploadPublication').count, 2);
  assert.equal(app.requests.filter((request) => request.body?.action === 'complete').length, 2);
});
