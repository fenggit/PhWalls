import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const React = require('react');
const ts = require('typescript');
const code = ts.transpileModule(readFileSync(new URL('../src/components/WallpaperPreviewDownload.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function setup({ video = false, fetchFile } = {}) {
  const state = [], refs = [], timers = [], events = [];
  let stateCursor = 0, refCursor = 0, downloads = 0;
  const downloadLinks = [];
  const module = { exports: {} };
  runInNewContext(code, {
    module, exports: module.exports,
    require(name) {
      if (name === 'react') return { ...React,
        useState(initial) {
          const index = stateCursor++;
          if (!(index in state)) state[index] = index === 0 ? '/preview.webp' : index === 1 ? false : initial;
          return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
        },
        useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; },
        useCallback: callback => callback, useMemo: callback => callback(), useEffect() {},
      };
      if (name === '@/components/LanguageProvider') return { useLanguage: () => ({ texts: {
        downloadWallpaper: 'Download', downloading: 'Downloading', downloadFailed: 'Failed',
        wallpaperActions: 'Actions',
      } }) };
      if (name === '@/lib/data') return { formatWallpaperDisplayName: value => value };
      if (name === '@/lib/analytics') return { trackAnalyticsEvent: name => events.push(name) };
      if (name === '@/lib/long-press') return { createLongPress: () => ({ cancel() {} }) };
      if (name.startsWith('@/')) return { __esModule: true, default: () => null };
      return require(name);
    },
    document: {
      createElement: () => ({ style: {}, click() { downloads++; downloadLinks.push(this.href); }, remove() {} }),
      body: { appendChild() {}, removeChild() {} },
    },
    window: { location: { href: 'https://phwalls.com/live/test' }, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} } },
    URL, fetch: fetchFile, setTimeout: (callback, delay) => { timers.push({ callback, delay }); },
    alert() {}, console: { error() {} },
  });
  const render = () => {
    stateCursor = refCursor = 0;
    return module.exports.default({ isOpen: true, onClose() {}, currentIndex: 0, onIndexChange() {}, categoryName: 'Test',
      wallpapers: [{ name: 'wallpaper', type: video ? 'video/mp4' : 'image/webp', size: '1MB',
        originPath: video ? 'wallpapers/test/origin/movie.mp4' : 'wallpapers/test/origin/image.webp', compressPath: 'preview.webp', tag: '' }],
    });
  };
  const find = (tree, predicate) => {
    if (!tree || typeof tree !== 'object') return null;
    if (predicate(tree)) return tree;
    return React.Children.toArray(tree.props?.children).map(child => find(child, predicate)).find(Boolean);
  };
  return {
    button: () => find(render(), node => node.type === 'button' && node.props['aria-label'] === 'Download'),
    spinning: () => Boolean(find(render(), node => node.props?.className?.includes('animate-spin'))),
    actions: () => {
      find(render(), node => node.type === 'button' && node.props['aria-label'] === 'Actions').props.onClick();
      return find(render(), node => typeof node.props?.onDownload === 'function');
    },
    finishTimers: () => { timers.splice(0).forEach(timer => timer.callback()); },
    downloads: () => downloads, downloadLinks, events,
  };
}

const click = button => button.props.onClick({ preventDefault() {}, stopPropagation() {} });
const flush = () => new Promise(resolve => setImmediate(resolve));

test('video download always requests the original file and never the browser preview', () => {
  const preview = setup({ video: true });
  click(preview.button());
  const url = new URL(preview.downloadLinks[0], 'https://phwalls.com');
  assert.equal(url.pathname, '/api/files/download');
  assert.equal(url.searchParams.get('key'), 'wallpapers/test/origin/movie.mp4');
  assert.equal(url.searchParams.get('key').includes('/preview/'), false);
});

test('video download shows a spinner and blocks repeated clicks until its startup cooldown ends', async () => {
  const preview = setup({ video: true });
  const button = preview.button();
  click(button);
  click(button); // A second click before React has rendered the disabled state.
  assert.equal(preview.downloads(), 1);
  assert.equal(preview.button().props.disabled, true);
  assert.equal(preview.spinning(), true);
  assert.equal(preview.actions().props.downloadDisabled, true);
  assert.equal(preview.actions().props.isDownloading, true);
  click(preview.button());
  assert.equal(preview.downloads(), 1);
  assert.equal(preview.events.filter(name => name === 'w_wallpaper_download_click').length, 1);
  preview.finishTimers();
  await flush();
  assert.equal(preview.button().props.disabled, false);
  assert.equal(preview.spinning(), false);
  click(preview.button());
  assert.equal(preview.downloads(), 2);
  preview.finishTimers();
  await flush();
});

test('image download stays locked while reading the response body and unlocks after saving', async () => {
  let requests = 0, finishBlob;
  const preview = setup({ fetchFile: async () => {
    requests++;
    return { ok: true, headers: { get: () => null }, blob: () => new Promise(resolve => { finishBlob = resolve; }) };
  } });
  const button = preview.button();
  click(button);
  click(button);
  await flush();
  assert.equal(requests, 1);
  assert.equal(preview.spinning(), true);
  assert.equal(preview.button().props.disabled, true);
  click(preview.button());
  assert.equal(requests, 1);
  finishBlob({});
  await flush();
  assert.equal(preview.downloads(), 1);
  assert.equal(preview.button().props.disabled, false);
  assert.equal(preview.spinning(), false);
  preview.finishTimers();
});

test('a failed download releases the lock and spinner so the user can retry', async () => {
  let requests = 0;
  const preview = setup({ fetchFile: async () => { requests++; throw new Error('Offline'); } });
  click(preview.button());
  await flush();
  assert.equal(preview.button().props.disabled, false);
  assert.equal(preview.spinning(), false);
  click(preview.button());
  await flush();
  assert.equal(requests, 2);
});
