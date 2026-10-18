import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

test('impressions require continuous visible dwell, stop in background, deduplicate and clean up', () => {
  const events = [], timers = new Map(), handlers = {};
  let intersection, timerId = 0;
  const element = { isConnected: true, dataset: { analyticsImpression: 'w_wallpaper_impression',
    analyticsParams: '{"wallpaper_id":"w1"}' }, getAttribute: () => null,
    closest() { return this; } };
  const root = { visibilityState: 'visible', querySelectorAll: () => [element],
    addEventListener: (name, handler) => { handlers[name] = handler; },
    removeEventListener: name => { delete handlers[name]; } };
  const module = { exports: {} };
  const source = readFileSync(new URL('../src/lib/analytics-dom.ts', import.meta.url), 'utf8');
  runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, { module, exports: module.exports,
    require: () => ({ trackAnalyticsEvent: (name, params) => events.push({ name, params }) }),
    IntersectionObserver: class { constructor(callback) { intersection = callback; } observe() {} unobserve() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id),
  });
  const stop = module.exports.observeAnalyticsImpressions(root);
  const tick = () => { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } };
  const enter = ratio => intersection([{ target: element, isIntersecting: ratio > 0, intersectionRatio: ratio }]);
  enter(0.49); tick(); assert.equal(events.length, 0);
  enter(0.8); enter(0); tick(); assert.equal(events.length, 0);
  enter(0.8); root.visibilityState = 'hidden'; handlers.visibilitychange(); tick(); assert.equal(events.length, 0);
  root.visibilityState = 'visible'; handlers.visibilitychange(); tick();
  assert.equal(events.length, 1);
  assert.equal(events[0].params.wallpaper_id, 'w1');
  enter(0); enter(1); tick(); assert.equal(events.length, 1);
  stop(); assert.equal(timers.size, 0); assert.equal(handlers.visibilitychange, undefined);
});
