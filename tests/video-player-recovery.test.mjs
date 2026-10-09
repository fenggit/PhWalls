import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const React = require('react');
const ts = require('typescript');

test('video errors keep the player mounted and retry loads a fresh source', () => {
  const state = []; let cursor = 0; let immersive = false; let toggles = 0;
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL('../src/components/VideoWallpaperPlayer.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  runInNewContext(code, { module, exports: module.exports, require(name) {
    if (name === 'react') return { ...React, useState(initial) {
      const index = cursor++; if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    } };
    if (name === '@/components/LanguageProvider') return { useLanguage: () => ({ texts: {
      videoLoadFailed: 'Video failed', retryVideo: 'Retry video', videoLoading: 'Loading video',
    } }) };
    return require(name);
  } });
  const render = () => { cursor = 0; return module.exports.default({ url: '/api/files/preview?key=movie', label: 'Movie', refreshToken: 0,
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
});
