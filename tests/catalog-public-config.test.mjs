import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const languages = ['en', 'zh', 'ja', 'vi', 'zh-hant'];
const readJson = (path) => JSON.parse(readFileSync(new URL(`../src/data/${path}`, import.meta.url), 'utf8'));

test('retired Huawei MatePad has no navigation or SEO category in any language', () => {
  for (const language of languages) {
    assert.ok(!readJson(`language/${language}/tab.json`).some((tab) => tab.type === 'huawei-matepad'), language);
    const seo = readJson(`language/${language}/seo.json`);
    assert.ok(!JSON.stringify(seo).includes('"huawei-matepad"'), language);
  }
  assert.ok(!Object.hasOwn(readJson('device-localization.json'), 'huawei-matepad'));
});

test('Latin brand names use official casing while translated names remain localized', () => {
  for (const language of languages) {
    const tabs = readJson(`language/${language}/tab.json`);
    assert.equal(tabs.find((tab) => tab.type === 'vivo').title, 'vivo', language);
    const realme = tabs.find((tab) => tab.type === 'realme').title;
    assert.ok(!realme.includes('Realme'), language);
    assert.equal(tabs.find((tab) => tab.type === 'oppo').title, 'OPPO', language);
    assert.equal(tabs.find((tab) => tab.type === 'poco').title, 'POCO', language);
  }
});
