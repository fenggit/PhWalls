import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outputArg = process.argv.indexOf('--out');
const output = outputArg >= 0 ? process.argv[outputArg + 1] : null;
if (outputArg >= 0 && !output) throw new Error('--out requires a filename');

const quote = (value) => value === null || value === undefined
  ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const stableId = (kind, key) => createHash('sha256').update(`${kind}:${key}`).digest('hex').slice(0, 32);
const slugify = (value) => value.toLowerCase().trim().replaceAll('&', ' and ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const normalizeName = (value) => String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
const parseSize = (value) => {
  const match = String(value || '').match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
  return match ? Math.round(Number(match[1]) * (1024 ** { b: 0, kb: 1, mb: 2, gb: 3 }[match[2].toLowerCase()])) : 0;
};
const inferCategory = (brand, name, desktop) => desktop ? 'desktop'
  : brand === 'huawei-matepad' ? 'pad'
  : brand === 'android' || brand === 'harmonyos' ? 'os'
  : /\bfold\b|\bflip\b/i.test(name) ? 'phone_fold' : 'phone';
const inferTheme = (name) => /(?:^|[-_ ])dark(?:$|[-_ ])/i.test(name) ? 'dark'
  : /(?:^|[-_ ])light(?:$|[-_ ])/i.test(name) ? 'light' : 'normal';
const files = [
  ...(await readdir(join(root, 'src/data'))).filter((file) => file.endsWith('.json') && file !== 'home-index.json')
    .map((file) => ({ file: join(root, 'src/data', file), desktop: false })),
  ...(await readdir(join(root, 'src/data/desktopwalls'))).filter((file) => file.endsWith('.json') && file !== 'tab.json')
    .map((file) => ({ file: join(root, 'src/data/desktopwalls', file), desktop: true })),
];

const sql = ['PRAGMA foreign_keys = ON;'];
const seenDevices = new Set();
const seenDeviceNames = new Set();
const seenWallpapers = new Set();
const warnings = [];
let deviceCount = 0;
let wallpaperCount = 0;

for (const { file, desktop } of files) {
  const brand = basename(file, '.json').replaceAll(' ', '-');
  const collections = JSON.parse(await readFile(file, 'utf8'));
  for (const [collectionIndex, collection] of collections.entries()) {
    let deviceName = collection.name;
    if (seenDeviceNames.has(`${brand}/${normalizeName(deviceName)}`)) {
      let suffix = 2;
      while (seenDeviceNames.has(`${brand}/${normalizeName(`${collection.name} (${suffix})`)}`)) suffix++;
      deviceName = `${deviceName} (${suffix})`;
      warnings.push(`设备名称冲突：${brand}/${collection.name} -> ${deviceName}`);
    }
    seenDeviceNames.add(`${brand}/${normalizeName(deviceName)}`);
    let slug = slugify(collection.name);
    if (!slug) throw new Error(`设备名称无法生成 slug：${file} #${collectionIndex}`);
    let deviceKey = `${brand}/${slug}`;
    if (seenDevices.has(deviceKey)) {
      const original = deviceKey;
      let suffix = 2;
      while (seenDevices.has(`${brand}/${slug}-${suffix}`)) suffix++;
      slug = `${slug}-${suffix}`;
      deviceKey = `${brand}/${slug}`;
      warnings.push(`设备 slug 冲突：${original} -> ${deviceKey}`);
    }
    seenDevices.add(deviceKey);
    const id = stableId('device', deviceKey);
    const category = inferCategory(brand, collection.name, desktop);
    const time = Date.UTC(2020, 0, 1) + collectionIndex * 100000;
    const logo = desktop ? null : `/brand-icons/${brand}.svg`;
    sql.push(`INSERT INTO w_devices (id,brand_logo,brand_name,device_name,name_key,device_slug,device_category,release_date,status,create_date,updated_date) VALUES (${[
      id, logo, brand, deviceName, normalizeName(deviceName), slug, category, collection.date || '', 'published', time, time
    ].map(quote).join(',')}) ON CONFLICT DO NOTHING;`);
    deviceCount++;
    for (const [index, item] of (collection.item || []).entries()) {
      let itemName = item.name;
      let key = `${deviceKey}/${itemName}`;
      if (seenWallpapers.has(key)) {
        const original = key;
        let suffix = 2;
        while (seenWallpapers.has(`${deviceKey}/${itemName}-${suffix}`)) suffix++;
        itemName = `${itemName}-${suffix}`;
        key = `${deviceKey}/${itemName}`;
        warnings.push(`壁纸名称冲突：${original} -> ${key}`);
      }
      seenWallpapers.add(key);
      const origin = item.originPath || '';
      const preview = item.compressPath || null;
      const ext = origin.split('.').pop()?.toLowerCase() || '';
      const dynamic = ['mp4', 'mov', 'webm'].includes(ext);
      if (!origin || !preview) warnings.push(`缺少原图或预览：${key}`);
      if (!item.size || !parseSize(item.size)) warnings.push(`缺少可解析大小：${key}`);
      const tags = item.tag ? [item.tag] : [];
      const wallpaperTime = time + index;
      const values = [stableId('wallpaper', key), id, itemName, item.type || (dynamic ? 'video/mp4' : 'image/jpeg'),
        parseSize(item.size), origin, preview, ext, inferTheme(item.name), dynamic ? 'dynamic' : 'static',
        category, index === 0 ? 1 : 0, JSON.stringify(tags), origin && preview ? 'published' : 'draft',
        wallpaperTime, wallpaperTime];
      sql.push(`INSERT INTO w_wallpapers (id,device_id,name,mime_type,size_bytes,origin_key,compress_key,file_format,theme,media_type,category,is_primary,tags,status,create_date,updated_date)
        SELECT ${values.map(quote).join(',')} WHERE EXISTS (SELECT 1 FROM w_devices WHERE id = ${quote(id)}) ON CONFLICT DO NOTHING;`);
      wallpaperCount++;
    }
  }
}
if (output) await writeFile(output, `${sql.join('\n')}\n`);
console.log(JSON.stringify({ devices: deviceCount, wallpapers: wallpaperCount, warnings: warnings.length, output, warningDetails: warnings.slice(0, 100) }, null, 2));
