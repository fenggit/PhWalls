import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const React = require('react');
const ts = require('typescript');

test('video errors keep the player mounted and retry loads a fresh source', () => {
  const state = [], refs = [], events = []; let cursor = 0, refCursor = 0; let immersive = false; let toggles = 0, ready = 0;
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL('../src/components/VideoWallpaperPlayer.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  runInNewContext(code, { module, exports: module.exports, require(name) {
    if (name === 'react') return { ...React, useState(initial) {
      const index = cursor++; if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    }, useRef(initial) { return refs[refCursor++] ??= { current: initial }; } };
    if (name === '@/lib/analytics') return { trackAnalyticsEvent: (name, params) => events.push({ name, params }) };
    if (name === '@/components/LanguageProvider') return { useLanguage: () => ({ texts: {
      videoLoadFailed: 'Video failed', retryVideo: 'Retry video', videoLoading: 'Loading video',
    } }) };
    return require(name);
  }, performance });
  const render = () => { cursor = refCursor = 0; return module.exports.default({ url: '/api/files/preview?key=movie', label: 'Movie', refreshToken: 0,
    analyticsParams: { wallpaper_id: 'movie-1' }, onReady: () => { ready++; },
    immersive, onToggleImmersive: () => { toggles++; } }); };
  const find = (tree, predicate) => {
    if (!tree || typeof tree !== 'object') return null;
    if (predicate(tree)) return tree;
    return React.Children.toArray(tree.props?.children).map(child => find(child, predicate)).find(Boolean);
  };
  let tree = render();
  assert.ok(find(tree, node => node.props?.role === 'status'));
  const before = find(tree, node => node.type === 'video');
  assert.equal(before.props.controls, false, 'hide native buffering controls while the custom loading indicator is visible');
  before.props.onError(); tree = render();
  assert.ok(find(tree, node => node.type === 'video'));
  assert.ok(find(tree, node => node.props?.role === 'alert'));
  find(tree, node => node.type === 'button').props.onClick(); tree = render();
  assert.ok(!find(tree, node => node.props?.role === 'alert'));
  const retried = find(tree, node => node.type === 'video');
  assert.notEqual(retried.props.src, before.props.src);
  retried.props.onCanPlay(); tree = render();
  assert.ok(!find(tree, node => node.props?.role === 'status'));
  const video = find(tree, node => node.type === 'video');
  assert.equal(video.props.controls, true);
  video.props.onWaiting(); tree = render();
  assert.equal(find(tree, node => node.type === 'video').props.controls, false);
  assert.ok(find(tree, node => node.props?.role === 'status'));
  find(tree, node => node.type === 'video').props.onCanPlay(); tree = render();
  assert.equal(find(tree, node => node.type === 'video').props.controls, true);
  video.props.onClick({ clientY: 580, currentTarget: { getBoundingClientRect: () => ({ bottom: 600 }) } });
  assert.equal(toggles, 0, 'native seek/play/fullscreen clicks must not hide controls');
  video.props.onClick({ clientY: 300, currentTarget: { getBoundingClientRect: () => ({ bottom: 600 }) } });
  assert.equal(toggles, 1);
  immersive = true; tree = render();
  assert.equal(find(tree, node => node.type === 'video').props.controls, false);
  assert.equal(events.filter(event => event.name === 'w_media_error').length, 1);
  assert.equal(events.find(event => event.name === 'w_media_error').params.wallpaper_id, 'movie-1');
  assert.equal(events.filter(event => event.name === 'w_video_retry').length, 1);
  const playing = find(tree, node => node.type === 'video');
  playing.props.onPlaying(); playing.props.onPlaying();
  assert.equal(ready, 1);
  assert.equal(events.filter(event => event.name === 'w_video_play').length, 1);
  playing.props.onTimeUpdate({ currentTarget: { currentTime: 8, duration: 10 } });
  playing.props.onTimeUpdate({ currentTarget: { currentTime: 9, duration: 10 } });
  assert.deepEqual(events.filter(event => event.name === 'w_video_progress').map(event => event.params.percent), [25, 50, 75]);
});
