import assert from 'node:assert/strict';
import test from 'node:test';
import { selectRecentCollections } from '../src/lib/home-curation.ts';

const collection = (name, date, withCover = true) => ({
  name,
  date,
  item: withCover ? [{ compressPath: `${name}.webp` }] : [],
});

test('selects recent covered collections across brands without future releases', () => {
  const collections = {
    samsung: [
      collection('Galaxy A', '2026/09/28'),
      collection('Galaxy B', '2026/09/27'),
      collection('Galaxy C', '2026/09/26'),
    ],
    xiaomi: [collection('Xiaomi A', '2026/09/29')],
    oppo: [collection('OPPO future', '2026/10/01'), collection('OPPO A', '2026/09')],
    vivo: [collection('Vivo missing cover', '2026/09/30', false)],
    hidden: [collection('Hidden A', '2026/09/29')],
  };

  const result = selectRecentCollections(
    collections,
    ['samsung', 'xiaomi', 'oppo', 'vivo'],
    4,
    new Date('2026-09-29T12:00:00Z')
  );

  assert.deepEqual(
    result.map(({ category, collection: entry }) => `${category}:${entry.name}`),
    ['xiaomi:Xiaomi A', 'samsung:Galaxy A', 'samsung:Galaxy B', 'oppo:OPPO A']
  );
});

test('allows a full preview row for a single brand', () => {
  const collections = {
    samsung: [
      collection('Galaxy A', '2026/09/28'),
      collection('Galaxy B', '2026/09/27'),
      collection('Galaxy C', '2026/09/26'),
      collection('Galaxy D', '2026/09/25'),
    ],
  };

  assert.deepEqual(
    selectRecentCollections(collections, ['samsung'], 4, new Date('2026-09-29'), 4)
      .map(({ collection: entry }) => entry.name),
    ['Galaxy A', 'Galaxy B', 'Galaxy C', 'Galaxy D']
  );
});
