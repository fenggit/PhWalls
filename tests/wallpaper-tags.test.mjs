import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const languages = ['en', 'zh', 'ja', 'vi', 'zh-hant'];
const dictionaries = Object.fromEntries(languages.map((language) => [language,
  JSON.parse(readFileSync(new URL(`../src/data/language/${language}/wallpaper-tags.json`, import.meta.url), 'utf8')),
]));

test('all 94 English labels are lowercase display strings and are their own translation keys', () => {
  const english = dictionaries.en;
  assert.equal(Object.keys(english).length, 94);
  for (const [key, value] of Object.entries(english)) {
    assert.equal(key, key.trim().toLowerCase());
    assert.match(key, /^[a-z0-9][a-z0-9 &-]*$/);
    assert.equal(value, key);
    assert.ok(key.length <= 40);
  }
  assert.equal(english['fluid art'], 'fluid art');
  assert.equal(Object.hasOwn(english, 'fluid_art'), false);
});

test('the five JSON dictionaries and the documented bilingual list cover the same English labels', () => {
  const keys = Object.keys(dictionaries.en).sort();
  for (const language of languages) {
    assert.deepEqual(Object.keys(dictionaries[language]).sort(), keys);
    for (const key of keys) assert.ok(dictionaries[language][key]?.trim(), `${language}:${key}`);
  }
  const document = readFileSync(new URL('../docs/wallpaper-tags.md', import.meta.url), 'utf8');
  for (const key of keys) assert.ok(document.includes(`| \`${key}\` | ${dictionaries.zh[key]} |`), key);
});
