import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

function fixture({ sourceType = 'default', rows = true, failUpload = false, tab = 'upload', devices = [], reconciledUploaded = false, confirmTargetChange = false } = {}) {
  const device = { id: 'mate-xt-2', brand_name: 'huawei', device_name: 'Huawei Mate XT 2',
    device_category: 'phone_fold', release_date: '2026/10/10', status: 'published', upload_prefix: 'huawei/Huawei Mate XT 2', updated_date: 1, deletion_state: 'none', static_deletion_state: 'none', dynamic_deletion_state: 'none' };
  const prefix = 'huawei/Huawei Mate XT 2';
  const states = new Map(Object.entries({ authenticated: true,
    brandRows: [{ slug: 'huawei', title: 'Huawei', kind: 'mobile' }], devices, uploadBrand: 'huawei', uploadDevices: [device],
    uploadDevice: device.id, uploadMedia: 'dynamic', uploadFolderName: device.device_name, uploadFolderState: 'matched',
    uploadDirectory: { deviceId: device.id, media: 'dynamic', data: { prefix, directories: sourceType === 'default' ? [] : [prefix], source: sourceType } },
    uploadRows: rows ? [{ id: 'live-group', name: 'live', stem: 'live', mediaType: 'dynamic', issues: [], origin: { name: 'live.mp4', type: 'video/mp4', size: 100 },
      preview: { name: 'live.webp', type: 'image/webp', size: 100 }, folderName: device.device_name,
      videoPreview: { name: 'live.mp4', type: 'video/mp4', size: 50 },
      theme: 'normal', tags: '', category: '', state: 'ready', progress: 0 }] : [],
  }));
  const refs = [];
  const requests = [];
  const puts = [];
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
    Fragment: Symbol.for('react.fragment'), useMemo: (fn) => fn(), useEffect() {}, useCallback: (callback) => callback,
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
      module, exports: module.exports, crypto: globalThis.crypto, URL, URLSearchParams, process: { env: {} },
      window: { confirm: () => confirmTargetChange,
        location: { href: `https://example.test/manager?tab=${tab}` }, history: { pushState() {} } },
      XMLHttpRequest: class {
        upload = {};
        status = 200;
        open(method, url) { this.url = url; } setRequestHeader() {}
        send(file) { puts.push(`${new URL(this.url).pathname}/${file.name}`); if (typeof failUpload === 'function' ? failUpload(file) : failUpload) this.onerror(); else this.onload(); }
      },
      async fetch(path, options) {
        const body = options.body ? JSON.parse(options.body) : null;
        requests.push({ path, method: options.method, body });
        let result;
        if (path === '/api/admin/upload') {
          result = body.action === 'reconcile' ? { data: { uploaded: reconciledUploaded } } : body.action === 'authorize' ? { url: `https://uploads.example/${body.role}`, token: body.role }
            : { data: { id: `asset-${body.name}`, is_primary: 1 } };
        } else if (path === '/api/admin/devices' && options.method === 'POST') {
          assert.fail('First Live collection must reuse the existing static device');
        } else result = { data: path.includes('devices') ? [device] : [], total: 0, page: 0 };
        return { ok: true, json: async () => result };
      },
      require(specifier) {
        if (specifier === 'react') return hooks;
        if (specifier === 'next/navigation') return { useSearchParams: () => new URLSearchParams({ tab }) };
        if (specifier === '@/app/manager/AdminDeviceI18nPanel') return { default: () => null };
        if (specifier === '@/lib/language') return { SUPPORTED_LANGUAGES: ['en', 'zh', 'ja', 'vi', 'zh-hant'] };
        if (specifier === '@/lib/data') return { buildWallpaperListTitle: () => '' };
        if (specifier === '@/lib/wallpaper-data') return { slugifyWallpaperName: () => '' };
        if (specifier.startsWith('@/') && specifier.endsWith('.json')) return JSON.parse(readFileSync(new URL(`../src/${specifier.slice(2)}`, import.meta.url), 'utf8'));
        if (specifier.startsWith('@/')) {
          const path = specifier.slice(2);
          return load(`${path}${existsSync(new URL(`../src/${path}.ts`, import.meta.url)) ? '.ts' : '.tsx'}`);
        }
        return require(specifier);
      },
    });
    return module.exports;
  }
  const render = () => {
    stateIndex = refIndex = 0;
    return load('app/manager/AdminConsole.tsx').default();
  };
  return { states, requests, puts, render, idle, setFailure: (value) => { failUpload = value; } };
}

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}
function label(node) {
  if (Array.isArray(node)) return node.map(label).join('');
  if (typeof node === 'number') return String(node);
  return typeof node === 'string' ? node : label(node?.props?.children || []);
}
function button(tree, text) { return nodes(tree).find((node) => node.type === 'button' && label(node) === text); }

test('a matched device uploads MP4 without a create-collection step and scopes publication to returned IDs', async () => {
  const app = fixture();
  const tree = app.render();
  assert.equal(button(tree, '创建动态合集'), undefined);
  assert.equal(nodes(tree).find(node => node.type === 'select' && node.props['aria-label'] === '壁纸类型'), undefined);
  const done = app.idle(); button(tree, '开始上传 (1)').props.onClick(); await done;
  assert.equal(app.states.get('uploadRows')[0].state, 'done');
  assert.equal(app.states.get('uploadRows')[0].wallpaperId, 'asset-live');
  const grants = app.requests.filter(request => request.body?.action === 'authorize');
  assert.equal(grants.length, 3);
  assert.ok(grants.every(request => request.body.media_type === 'dynamic' && request.body.group_id === 'live-group' && request.body.r2_prefix === 'huawei/Huawei Mate XT 2'));
  assert.equal(app.requests.find(request => request.body?.action === 'complete').body.video_preview_token, 'preview');
  button(app.render(), '发布选中素材 (1)').props.onClick();
  assert.deepEqual(Array.from(app.states.get('collectionAction').ids), ['asset-live']);
  assert.equal(app.requests.some(request => request.body?.publish_drafts === true), false);
});

test('a cover retry keeps the successful original upload and authorization group', async () => {
  const app = fixture({ failUpload: file => file.name === 'live.webp' });
  let done = app.idle(); button(app.render(), '开始上传 (1)').props.onClick(); await done;
  assert.equal(app.states.get('uploadRows')[0].state, 'failed');
  app.setFailure(false); done = app.idle(); button(app.render(), '重试失败项').props.onClick(); await done;
  assert.equal(app.states.get('uploadRows')[0].state, 'done');
  assert.deepEqual(app.puts, ['/origin/live.mp4', '/compress/live.webp', '/compress/live.webp', '/preview/live.mp4']);
  assert.equal(app.requests.filter(request => request.body?.action === 'authorize').length, 3);
});

test('an empty queue cannot upload and does not create a collection', () => {
  const app = fixture({ rows: false });
  const tree = app.render();
  assert.equal(button(tree, '开始上传').props.disabled, true);
  assert.equal(button(tree, '创建动态合集'), undefined);
  assert.equal(app.requests.length, 0);
});

test('partial failure preserves successful IDs and a retry does not upload them again', async () => {
  const app = fixture({ failUpload: file => file.name === 'second.mp4' });
  const first = app.states.get('uploadRows')[0];
  app.states.set('uploadRows', [first, { ...first, id: 'second-group', stem: 'second', name: 'second', origin: { ...first.origin, name: 'second.mp4' }, preview: { ...first.preview, name: 'second.webp' }, videoPreview: undefined }]);
  let done = app.idle(); button(app.render(), '开始上传 (2)').props.onClick(); await done;
  assert.deepEqual(app.states.get('uploadRows').map(row => row.state), ['done', 'failed']);
  button(app.render(), '发布选中素材 (1)').props.onClick();
  assert.deepEqual(Array.from(app.states.get('collectionAction').ids), ['asset-live']);
  app.setFailure(false); done = app.idle(); button(app.render(), '重试失败项').props.onClick(); await done;
  assert.deepEqual(app.states.get('uploadRows').map(row => row.state), ['done', 'done']);
  assert.equal(app.requests.filter(request => request.body?.action === 'complete').length, 2);
  assert.equal(app.puts.filter(key => key === '/origin/live.mp4').length, 1);
});

test('folder selection pairs mixed originals with covers and preserves optional preview', async () => {
  const app = fixture({ rows: false });
  const folder = nodes(app.render()).find(node => node.type === 'input' && node.props.webkitdirectory !== undefined);
  const file = (name, type, role) => ({ name, type, size: 100, webkitRelativePath: `Huawei Mate XT 2/${role}/${name}` });
  const files = [file('live.mp4','video/mp4','origin'),file('live.webp','image/webp','compress'),file('live.mp4','video/mp4','preview'),file('still.jpg','image/jpeg','origin'),file('still.webp','image/webp','compress')];
  await folder.props.onChange({ target: { files, value: 'folder' } });
  const queue = app.states.get('uploadRows');
  assert.equal(queue.length, 2); assert.equal(queue[0].videoPreview.name, 'live.mp4');
  assert.equal(queue[0].mediaType, 'dynamic'); assert.equal(queue[1].mediaType, 'static');
});

test('ambiguous originals block upload and expose all source filenames without overwrite', async () => {
  const app = fixture({ rows: false });
  const folder = nodes(app.render()).find(node => node.type === 'input' && node.props.webkitdirectory !== undefined);
  const files = [['01.mp4','video/mp4','origin'],['01.jpg','image/jpeg','origin'],['01.webp','image/webp','compress']].map(([name,type,role]) => ({ name,type,size:100,webkitRelativePath:`Huawei Mate XT 2/${role}/${name}` }));
  await folder.props.onChange({ target: { files, value: 'folder' } });
  const tree = app.render(); assert.equal(app.states.get('uploadRows').length, 0);
  assert.match(label(tree), /同一主名有多个原文件/); assert.match(label(tree), /01.mp4/); assert.match(label(tree), /01.jpg/);
  assert.equal(button(tree, '开始上传').props.disabled, true);
});

test('dynamic uploads accept an absent browser preview and keep MP4-only file selectors', async () => {
  const app = fixture(); app.states.set('uploadRows', app.states.get('uploadRows').map(row => ({ ...row, videoPreview: undefined })));
  const tree = app.render();
  assert.ok(nodes(tree).some(node => node.type === 'input' && node.props.accept === 'video/mp4,.mp4'));
  assert.ok(!nodes(tree).some(node => String(node.props?.accept).includes('webm')));
  const done = app.idle(); button(tree, '开始上传 (1)').props.onClick(); await done;
  assert.equal(app.states.get('uploadRows')[0].state, 'done');
  assert.equal(app.requests.find(request => request.body?.action === 'complete').body.video_preview_token, undefined);
});

test('one device row expands to scoped static and dynamic collection actions', () => {
  const mixed = { id:'mixed',brand_name:'huawei',device_name:'Mixed Phone',device_slug:'mixed-phone',device_category:'phone',status:'published',deletion_state:'none',static_deletion_state:'none',dynamic_deletion_state:'none',static_count:4,dynamic_count:3,wallpaper_count:7,pending_deletion_count:0,release_date:'2026/10/12' };
  const app = fixture({ tab:'devices',devices:[mixed] });
  let tree = app.render();
  assert.equal(nodes(tree).filter(node => node.type === 'tr' && label(node).includes('Mixed Phone')).length, 1);
  const expand = nodes(tree).find(node => node.type === 'button' && node.props['aria-expanded'] === false); expand.props.onClick();
  tree = app.render();
  assert.equal(nodes(tree).filter(node => node.type === 'tr' && label(node).includes('Mixed Phone')).length, 1);
  const live = nodes(tree).find(node => node.type === 'div' && node.props.className === 'rounded-md border border-[#dfe6df] bg-white p-4' && label(node).startsWith('动态'));
  assert.ok(live); button(live,'多语言').props.onClick(); assert.equal(app.states.get('describingDevice').media,'dynamic');
  button(live,'下架此合集').props.onClick(); assert.equal(app.states.get('collectionAction').media,'dynamic');
  button(live,'删除合集').props.onClick(); assert.equal(app.states.get('deletingDevice').media_type,'dynamic');
});

test('pending empty device keeps deletion retry available while editing is disabled', () => {
  const pending = { id:'pending',brand_name:'huawei',device_name:'Pending Phone',device_slug:'pending-phone',device_category:'phone',status:'unpublished',deletion_state:'pending',static_deletion_state:'none',dynamic_deletion_state:'none',static_count:0,dynamic_count:0,wallpaper_count:0,pending_deletion_count:0,release_date:'' };
  const app = fixture({ tab:'devices',devices:[pending] }); const tree=app.render();
  assert.equal(button(tree,'编辑').props.disabled,true);
  assert.ok(button(tree,'待重试删除'));
});

test('expired unuploaded grants renew while uploaded expired groups stop with an object reconciliation message', async () => {
  const fresh = fixture();
  fresh.states.set('uploadRows',fresh.states.get('uploadRows').map(row=>({...row,originGrant:{token:'expired',url:'https://uploads.example/origin',expiresAt:1}})));
  let done=fresh.idle();button(fresh.render(),'开始上传 (1)').props.onClick();await done;
  assert.equal(fresh.states.get('uploadRows')[0].state,'done');
  assert.equal(fresh.requests.filter(request=>request.body?.action==='authorize').length,3);
  const uploaded=fixture();
  uploaded.states.set('uploadRows',uploaded.states.get('uploadRows').map(row=>({...row,originUploaded:true,originGrant:{token:'expired',key:'huawei/Huawei Mate XT 2/origin/live.mp4',url:'https://uploads.example/origin',expiresAt:1}})));
  done=uploaded.idle();button(uploaded.render(),'开始上传 (1)').props.onClick();await done;
  const failed=uploaded.states.get('uploadRows')[0];assert.equal(failed.requiresReconciliation,true);assert.match(failed.error,/授权已过期/);
  const tree=uploaded.render();assert.equal(button(tree,'重试失败项').props.disabled,true);assert.equal(uploaded.puts.length,0);
  assert.match(label(tree),/huawei\/Huawei Mate XT 2\/origin\/live.mp4/);
});


test('upload-more to another device in the same brand resets the previous queue and target authorization', () => {
  const target = { id:'other-device',brand_name:'huawei',device_name:'Other Device',device_slug:'other-device',device_category:'phone',status:'published',deletion_state:'none',static_deletion_state:'none',dynamic_deletion_state:'none',static_count:1,dynamic_count:0,wallpaper_count:1,pending_deletion_count:0,release_date:'' };
  const app=fixture({tab:'devices',devices:[target],confirmTargetChange:true});app.states.set('expandedDevices',new Set(['other-device']));
  button(app.render(),'上传补充').props.onClick();
  assert.equal(app.states.get('uploadDevice'),'other-device');assert.equal(app.states.get('uploadRows').length,0);assert.equal(app.states.get('uploadFiles').length,0);
});

test('a committed PUT with a lost response continues only after signed server reconciliation', async () => {
  const app=fixture({failUpload:file=>file.name==='live.mp4',reconciledUploaded:true});
  const done=app.idle();button(app.render(),'开始上传 (1)').props.onClick();await done;
  assert.equal(app.states.get('uploadRows')[0].state,'done');
  assert.equal(app.puts.filter(key=>key==='/origin/live.mp4').length,1);
  const proofs=app.requests.filter(request=>request.body?.action==='reconcile');assert.equal(proofs.length,2);
  assert.ok(proofs.every(request=>request.body.device_id==='mate-xt-2' && request.body.upload_token));
});
test('folder selection counts ignored notes and system files outside role directories', async () => {
  const app=fixture({rows:false});const folder=nodes(app.render()).find(node=>node.type==='input' && node.props.webkitdirectory!==undefined);
  const files=[{name:'still.jpg',type:'image/jpeg',size:100,webkitRelativePath:'Huawei Mate XT 2/origin/still.jpg'},{name:'still.webp',type:'image/webp',size:100,webkitRelativePath:'Huawei Mate XT 2/compress/still.webp'},{name:'.DS_Store',type:'',size:10,webkitRelativePath:'Huawei Mate XT 2/.DS_Store'},{name:'_source.txt',type:'text/plain',size:10,webkitRelativePath:'Huawei Mate XT 2/_source.txt'}];
  await folder.props.onChange({target:{files,value:'folder'}});
  assert.match(label(app.render()),/已忽略说明 \/ 系统文件 2/);
});

test('an unconfigured dynamic queue lets per-item authorization persist its prefix without device PATCH', async () => {
  const app=fixture();
  app.states.set('uploadDevices',app.states.get('uploadDevices').map(device=>({...device,upload_prefix:null,static_deletion_state:'pending',dynamic_deletion_state:'none'})));
  const done=app.idle();button(app.render(),'开始上传 (1)').props.onClick();await done;
  assert.equal(app.requests.some(request=>request.path==='/api/admin/devices' && request.method==='PATCH'),false);
  assert.equal(app.requests.filter(request=>request.body?.action==='authorize').length,3);
  assert.equal(app.states.get('uploadRows')[0].state,'done');
});
