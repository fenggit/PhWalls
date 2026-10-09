import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('generated desktop cover and search indexes preserve both media categories of one model', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'phwalls-media-catalog-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(new URL('../src/data/', import.meta.url), join(root, 'src/data'), { recursive: true });
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'public'));
  cpSync(new URL('../scripts/generate-home-index.mjs', import.meta.url), join(root, 'scripts/generate-home-index.mjs'));
  writeFileSync(join(root, 'src/data/desktopwalls/microsoft-windows.json'), JSON.stringify([{
    name: 'Mixed desktop', date: '2026-01-01', item: [
      { name: 'still', type: 'image/png', originPath: 'desktopwalls/windows/origin/still.png', compressPath: 'desktopwalls/windows/compress/still.webp' },
      { name: 'movie1', type: 'video/mp4', originPath: 'desktopwalls/windows/origin/movie1.mp4', compressPath: 'desktopwalls/windows/compress/movie1.webp' },
      { name: 'movie2', type: 'video/mp4', originPath: 'desktopwalls/windows/origin/movie2.mp4', compressPath: 'desktopwalls/windows/compress/movie2.webp' },
    ],
  }]));
  const result = spawnSync(process.execPath, [join(root, 'scripts/generate-home-index.mjs')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const covers = JSON.parse(readFileSync(join(root, 'src/data/desktop-home-index.json'), 'utf8'))['microsoft-windows'];
  assert.equal(covers.length, 2);
  assert.deepEqual(covers.map(collection => collection.count), [1, 2]);
  assert.equal(covers[0].item[0].type, 'image/png');
  assert.equal(covers[1].item[0].type, 'video/mp4');
  const entries = JSON.parse(readFileSync(join(root, 'public/search-index.json'), 'utf8')).filter(entry => entry.name === 'Mixed desktop');
  assert.equal(entries.length, 2);
  assert.ok(entries.every(entry => entry.desktop));
  assert.equal(entries.find(entry => !entry.live).count, 1);
  assert.equal(entries.find(entry => entry.live).count, 2);
});
