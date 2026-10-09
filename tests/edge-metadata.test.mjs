import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const fixEdgeMetadata = require('../scripts/loaders/edge-metadata.cjs');
const template = readFileSync(require.resolve('next/dist/esm/build/templates/edge-ssr-app.js'), 'utf8');

test('Next Edge rendering honors the configured blocking metadata user agents', () => {
  const source = fixEdgeMetadata(template);
  const expression = source.match(/serveStreamingMetadata: (.*),/)[1];
  const streaming = (userAgent, htmlLimitedBots) => runInNewContext(expression, {
    req: { headers: new Headers({ 'user-agent': userAgent }) }, nextConfig: { htmlLimitedBots },
  });
  assert.equal(streaming('Mozilla/5.0', '.*'), false);
  assert.equal(streaming('Googlebot', '.*'), false);
  assert.equal(streaming('Twitterbot', 'Twitterbot'), false);
  assert.equal(streaming('Mozilla/5.0', 'Twitterbot'), true);
  assert.equal(streaming('Mozilla/5.0', undefined), true);
});

test('an incompatible Next Edge template fails the build instead of silently losing SEO metadata', () => {
  assert.throws(() => fixEdgeMetadata('export const changedTemplate = true;'), /Edge metadata/);
});
