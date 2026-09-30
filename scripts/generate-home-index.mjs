// 生成首页轻量索引：src/data/home-index.json
//
// 首页精选和 sitemap 需要所有品牌的轻量集合索引，
// 若在 Edge Function 里直接解析全部品牌 JSON，冷启动 CPU 时间
// 可能超出 Cloudflare 限制。
//
// 本脚本在构建前把每个集合裁剪为「封面图 + 数量」的极小数据：
//   { name, date, count, item: [firstImage] }
// 首页只从索引中挑选少量卡片；完整 item 列表仍由品牌页按需加载。

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(scriptDir, '..', 'src', 'data');

// 与 src/lib/wallpaper-data.ts 的 brandLoaders 保持一致。
const brandFiles = {
  android: 'android.json',
  'asus-rog-phone': 'asus rog phone.json',
  'google-pixel': 'google pixel.json',
  harmonyos: 'harmonyos.json',
  honor: 'honor.json',
  huawei: 'huawei.json',
  'huawei-matepad': 'huawei matepad.json',
  iqoo: 'iqoo.json',
  motorola: 'motorola.json',
  nokia: 'nokia.json',
  nothing: 'nothing.json',
  oneplus: 'oneplus.json',
  oppo: 'oppo.json',
  poco: 'poco.json',
  realme: 'realme.json',
  redmi: 'redmi.json',
  samsung: 'samsung.json',
  smartisan: 'smartisan.json',
  sony: 'sony.json',
  'transsion-infinix': 'transsion infinix.json',
  'transsion-tecno': 'transsion tecno.json',
  vivo: 'vivo.json',
  xiaomi: 'xiaomi.json',
};

const index = {};

for (const [slug, file] of Object.entries(brandFiles)) {
  const raw = await readFile(join(dataDir, file), 'utf8');
  const collections = JSON.parse(raw);
  index[slug] = (Array.isArray(collections) ? collections : []).map((collection) => {
    const items = Array.isArray(collection.item) ? collection.item : [];
    return {
      name: collection.name,
      date: collection.date,
      count: items.length,
      item: items.length > 0 ? [items[0]] : [],
    };
  });
}

await writeFile(join(dataDir, 'home-index.json'), JSON.stringify(index));

const desktopIndex = {};
for (const [slug, file] of Object.entries({
  'microsoft-windows': 'microsoft-windows.json',
  'microsoft-surface': 'microsoft-surface.json',
  ubuntu: 'ubuntu.json',
})) {
  const raw = await readFile(join(dataDir, 'desktopwalls', file), 'utf8');
  const collections = JSON.parse(raw);
  desktopIndex[slug] = (Array.isArray(collections) ? collections : [])
    .filter((collection) =>
      Array.isArray(collection.item) && collection.item.length > 0 &&
      Date.parse(collection.date) <= Date.now() && !/mobile phone/i.test(collection.name)
    )
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
    .slice(0, 1)
    .map((collection) => ({
      name: collection.name,
      date: collection.date,
      count: collection.item.length,
      item: [collection.item[0]],
    }));
}
await writeFile(join(dataDir, 'desktop-home-index.json'), JSON.stringify(desktopIndex));

const totalCollections = Object.values(index).reduce((sum, list) => sum + list.length, 0);
console.log(`home-index.json generated: ${Object.keys(index).length} brands, ${totalCollections} collections`);
