// Read-only checks against a running production preview. No remote writes.
// node scripts/check-discovery.mjs http://localhost:3117
import assert from 'node:assert/strict';
import { createTsLoader } from './tests/load-ts.mjs';
const load = createTsLoader();
const { WALLPAPER_THEMES, getWallpaperThemeCopy } = load('src/lib/wallpaper-themes.ts');
const languages = ['en', 'zh', 'ja', 'vi', 'zh-hant'];
const base = process.argv[2] || 'http://localhost:3117';
const origin = 'https://phwalls.com';
const request = (path, headers = {}) => fetch(new URL(path, base), { redirect: 'manual', headers,
  signal: AbortSignal.timeout(30000) });
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'");
const meta = (html, name) => decode(html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1] || '');
const checked = [];
for (const language of languages) for (const theme of WALLPAPER_THEMES) {
  const path = `/${language}/themes/${theme.slug}`;
  const response = await request(path);
  assert.equal(response.status, 200, path);
  const html = await response.text(), head = html.split('</head>')[0];
  assert.match(head, new RegExp(`rel="canonical" href="${origin}${path}"`));
  for (const alternate of languages) assert.ok(head.includes(`href="${origin}/${alternate}/themes/${theme.slug}"`));
  assert.ok(html.includes(`<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">${getWallpaperThemeCopy(theme, language).title}</h1>`));
  const schema = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
    .map(match => JSON.parse(match[1])).find(item => item['@type'] === 'ImageGallery');
  assert.ok(schema.numberOfItems >= 1 && schema.numberOfItems <= 48);
  assert.equal(schema.numberOfItems, (html.match(/<article\b/g) || []).length);
  const related = html.match(/<section[^>]*aria-labelledby="related-wallpaper-themes-title"[\s\S]*?<\/section>/)?.[0];
  assert.ok(related, `related theme cards: ${path}`);
  assert.equal((related.match(/<img\b/g) || []).length, 3);
  const gallery = [...html.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(match => match[0]).join('').replace(/<!--.*?-->/gs, '');
  assert.doesNotMatch(gallery, />\+\d+<\/button>/, `visible tags without folded counters: ${path}`);
  assert.equal(schema.inLanguage, language);
  assert.ok(schema.associatedMedia.every(item => item.isPartOf.url.startsWith(`${origin}/${language}/`)));
  checked.push({ path, wallpapers: schema.numberOfItems });
}
assert.equal((await request('/en/themes/not-a-theme')).status, 404);
const redirect = await request('/themes/gradient');
assert.equal(redirect.status, 307);
assert.equal(new URL(redirect.headers.get('location')).pathname, '/en/themes/gradient');
const preferred = await request('/en/themes/gradient', { cookie: 'phwalls-lang=zh; phwalls-lang-selected=1' });
assert.equal(new URL(preferred.headers.get('location')).pathname, '/zh/themes/gradient');
for (const language of languages) {
  for (const path of ['/wallpapers/samsung/samsung-galaxy-a17-5g',
    '/desktop/wallpapers/microsoft-windows/windows-11', '/live/wallpapers/samsung/samsung-galaxy-s25']) {
    const r = await request(`/${language}${path}`);
    assert.equal(r.status, 200, `/${language}${path}`);
    const html = await r.text();
    const related = html.match(/<section[^>]*aria-labelledby="related-wallpapers-title"[\s\S]*?<\/section>/)?.[0];
    assert.ok(related, `related links: ${language}${path}`);
    assert.ok((related.match(/<li>/g) || []).length <= 8);
    assert.ok((related.match(new RegExp(`href="/${language}/`, 'g')) || []).length >= 2);
    const bodyIntro = html.match(/<h1[^>]*>.*?<\/h1>\s*<p[^>]*>(.*?)<\/p>/s)?.[1];
    assert.equal(decode(bodyIntro || ''), meta(html, 'description'), `body/metadata agreement: ${language}${path}`);
    assert.match(html, /aria-label="(?:Tags|标签|タグ|Nhãn|標籤)"/);
  }
}
const sitemap = await (await request('/sitemap.xml')).text();
const themeUrls = [...sitemap.matchAll(/<loc>([^<]*\/themes\/[^<]+)<\/loc>/g)].map(match => match[1]);
assert.equal(themeUrls.length, 50);
assert.equal(new Set(themeUrls).size, 50);
for (const language of languages) {
  assert.equal(themeUrls.filter(url => url.startsWith(`${origin}/${language}/themes/`)).length, 10);
  const homepage = await (await request(`/${language}`)).text();
  for (const theme of WALLPAPER_THEMES) assert.ok(homepage.includes(`href="/${language}/themes/${theme.slug}"`));
}
console.log(JSON.stringify({ themePages: checked.length, themes: 10, languages, detailPages: 15, sitemapThemeUrls: themeUrls.length,
  unknownTheme: '404', languagePreservesTheme: true, bodyMetadataAgreement: true, homepageThemeLinks: 50,
  relatedThemeCoverCards: true, themeTagsFullyVisible: true }, null, 2));
