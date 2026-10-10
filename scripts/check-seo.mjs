// Verify rendered HTML, redirects, sitemap and video crawlability against a running site.
// Usage: node scripts/check-seo.mjs http://localhost:3102 [canonical origin] [user agent]
import assert from 'node:assert/strict';

const baseUrl = process.argv[2] || 'http://localhost:3102';
const canonicalOrigin = process.argv[3] || 'https://phwalls.com';
const defaultUserAgent = process.argv[4] || 'Mozilla/5.0';
const languages = ['en', 'zh', 'ja', 'vi', 'zh-hant'];
const paths = ['', '/live-wallpapers', '/live-wallpapers/samsung', '/samsung', '/desktop',
  '/wallpapers/samsung/samsung-galaxy-s25', '/live/wallpapers/samsung/samsung-galaxy-s25',
  '/desktop/wallpapers/microsoft-windows/windows-11', '/design', '/about', '/privacy'];
const failures = [];
let checks = 0;

function tags(html, name, attribute, value) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => match[0])
    .filter(tag => new RegExp(`\\b${attribute}=["']${value}["']`, 'i').test(tag));
}

function attr(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];
}

async function request(path, userAgent = defaultUserAgent) {
  return fetch(new URL(path, baseUrl), {
    redirect: 'manual', headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(30000),
  });
}

async function check(label, action) {
  try { await action(); checks++; }
  catch (error) { failures.push(`${label}: ${error.message}`); }
}

const videoUrls = new Set();
const jobs = languages.flatMap(language => paths.map(path => async () => {
  const localizedPath = `/${language}${path}`;
  await check(localizedPath, async () => {
    const response = await request(localizedPath);
    assert.equal(response.status, 200, 'HTTP status');
    const html = await response.text();
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
    const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';
    assert.equal((html.match(/<title\b/gi) || []).length, 1, 'one title');
    assert.equal((head.match(/<title\b/gi) || []).length, 1, 'title in head');
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'one H1');
    const descriptions = tags(html, 'meta', 'name', 'description');
    assert.equal(descriptions.length, 1, 'one description');
    assert.equal(tags(head, 'meta', 'name', 'description').length, 1, 'description in head');
    const canonical = tags(html, 'link', 'rel', 'canonical');
    assert.equal(canonical.length, 1, 'one canonical');
    assert.equal(tags(head, 'link', 'rel', 'canonical').length, 1, 'canonical in head');
    assert.equal(attr(canonical[0], 'href'), `${canonicalOrigin}${localizedPath}`, 'localized canonical');
    const alternates = tags(head, 'link', 'rel', 'alternate');
    for (const alternateLanguage of languages) {
      assert.ok(alternates.some(tag => attr(tag, 'href') === `${canonicalOrigin}/${alternateLanguage}${path}`),
        `alternate ${alternateLanguage}`);
    }
    assert.ok(!/<a\b[^>]*href=["']\/(?:en|zh|ja|vi|zh-hant)\/live(?:\/[^/"']+)?["']/i.test(html), 'no old landing links');
    if (path === '/design') {
      assert.equal((head.match(/<title[^>]*>(.*?)<\/title>/i)?.[1].match(/PhWalls/g) || []).length, 1, 'one brand in design title');
    }
    if (path.startsWith('/live/wallpapers/')) {
      assert.ok(body.includes(attr(descriptions[0], 'content')), 'description matches page content');
      for (const match of html.matchAll(/"contentUrl":"([^"]+)"/g)) videoUrls.add(match[1]);
    }
  });
}));
for (let i = 0; i < jobs.length; i += 5) await Promise.all(jobs.slice(i, i + 5).map(job => job()));

for (const language of languages) {
  for (const suffix of ['', '/', '/samsung', '/samsung/']) await check(`redirect ${language}${suffix}`, async () => {
    const response = await request(`/${language}/live${suffix}?source=share`);
    assert.equal(response.status, 308);
    const location = new URL(response.headers.get('location'), baseUrl);
    assert.equal(location.pathname + location.search, `/${language}/live-wallpapers${suffix.replace(/\/$/, '')}?source=share`);
  });
}

await check('sitemap', async () => {
  const response = await request('/sitemap.xml');
  assert.equal(response.status, 200);
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.equal(new Set(urls).size, urls.length, 'unique sitemap URLs');
  for (const language of languages) {
    assert.ok(urls.includes(`${canonicalOrigin}/${language}/live-wallpapers`));
    assert.ok(urls.includes(`${canonicalOrigin}/${language}/live-wallpapers/samsung`));
  }
  assert.ok(!urls.some(url => /\/(?:en|zh|ja|vi|zh-hant)\/live(?:\/[^/]+)?$/.test(url)), 'no old landing URLs');
});

await check('video crawlability', async () => {
  const response = await request('/robots.txt');
  assert.equal(response.status, 200);
  const robots = await response.text();
  const rules = [...robots.matchAll(/^(Allow|Disallow):\s*(\S+)/gmi)]
    .map(([, kind, path]) => ({ allow: kind.toLowerCase() === 'allow', path }));
  const allowed = path => rules.filter(rule => path.startsWith(rule.path))
    .sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow))[0]?.allow ?? true;
  assert.ok(videoUrls.size > 0, 'VideoObject URLs found');
  for (const url of videoUrls) {
    const parsed = new URL(url);
    assert.ok(allowed(parsed.pathname + parsed.search), `crawlable video ${parsed.pathname}`);
  }
  assert.equal(allowed('/api/files/download?key=test'), false, 'downloads remain disallowed');
  assert.equal(allowed('/api/admin/session'), false, 'admin APIs remain disallowed');
});

for (const failure of failures) console.error(failure);
console.log(`SEO verification: ${checks} passed, ${failures.length} failed (${baseUrl}).`);
if (failures.length) process.exitCode = 1;
