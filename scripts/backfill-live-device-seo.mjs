import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localizeDeviceName } from './device-localization.mjs';
import { classifyCollection } from './backfill-device-seo.mjs';

const languages = ['en', 'zh', 'ja', 'vi', 'zh-hant'];

export function buildLiveDeviceSeoRows(device) {
  const count = device.wallpaper_count;
  if (!device.id || !device.device_name || !Number.isSafeInteger(count) || count < 1) {
    throw new Error(`Invalid Live inventory: ${device.id}`);
  }
  const formats = [...new Set((device.file_formats || 'mp4').split(',').map(value => value.toUpperCase()))].sort().join('/');
  const desktop = classifyCollection(device) === 'desktop';
  return languages.map(language => {
    const name = localizeDeviceName(device.brand_name, device.device_name, language);
    const copy = {
      en: [`${name} Live Wallpapers - Free MP4 Downloads`,
        `Explore ${count} ${name} live ${count === 1 ? 'wallpaper' : 'wallpapers'}. Play video previews and download the original ${formats} files for free. Use a compatible device or wallpaper app to set a video as your ${desktop ? 'desktop' : 'home or lock screen'} background.`],
      zh: [`${name}动态壁纸免费下载 - MP4 视频`,
        `收录${count}段${name}动态壁纸，支持在线观看视频预览，免费下载原始${formats}文件。为${desktop ? '电脑桌面' : '手机主屏幕或锁屏'}挑选动态背景，设置时需使用支持视频壁纸的设备或应用。`],
      ja: [`${name}のライブ壁紙｜MP4動画を無料ダウンロード`,
        `${name}のライブ壁紙${count}本を掲載。動画をプレビューして、元の${formats}ファイルを無料でダウンロードできます。${desktop ? 'デスクトップ背景' : 'ホーム画面やロック画面'}への設定には、動画壁紙に対応した端末またはアプリが必要です。`],
      vi: [`Hình nền động ${name} - Tải video MP4 miễn phí`,
        `Khám phá ${count} hình nền động ${name}. Xem trước video và tải miễn phí tệp ${formats} gốc để chọn hình nền cho ${desktop ? 'màn hình máy tính' : 'màn hình chính hoặc màn hình khóa'}. Cần thiết bị hoặc ứng dụng hỗ trợ hình nền video để sử dụng.`],
      'zh-hant': [`${name}動態桌布下載 - 免費 MP4 影片`,
        `精選${count}段${name}動態桌布，可線上預覽影片，免費下載原始${formats}檔案。為${desktop ? '電腦桌面' : '手機主畫面或鎖定畫面'}挑選動態背景；設定時需使用支援影片桌布的裝置或應用程式。`],
    }[language];
    if (copy[0].length > 200 || copy[1].length > 5000) throw new Error(`Copy exceeds schema limit: ${device.id}/${language}`);
    return { id: createHash('sha256').update(`phwalls-live-device-seo-v1:${device.id}:${language}`).digest('hex').slice(0, 32),
      device_id: device.id, media_type: 'dynamic', brand_name: device.brand_name, device_name: device.device_name,
      language, display_name: name, seo_title: copy[0], description: copy[1] };
  });
}

const quote = value => `'${String(value).replaceAll("'", "''")}'`;
export function buildLiveInsertSql(rows, timestamp = Date.now()) {
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) throw new Error('Invalid timestamp');
  return rows.map(row => `INSERT INTO w_live_device_i18n (id,device_id,language,display_name,seo_title,description,create_date,updated_date)
SELECT ${[row.id, row.device_id, row.language, row.display_name, row.seo_title, row.description].map(quote).join(',')},${timestamp},${timestamp}
WHERE EXISTS (SELECT 1 FROM w_devices WHERE id=${quote(row.device_id)} AND brand_name=${quote(row.brand_name)} AND device_name=${quote(row.device_name)})
ON CONFLICT (device_id,language) DO UPDATE SET
  display_name=COALESCE(w_live_device_i18n.display_name,excluded.display_name),
  seo_title=COALESCE(w_live_device_i18n.seo_title,excluded.seo_title),
  description=COALESCE(w_live_device_i18n.description,excluded.description),updated_date=excluded.updated_date
WHERE w_live_device_i18n.display_name IS NULL OR w_live_device_i18n.seo_title IS NULL OR w_live_device_i18n.description IS NULL;`).join('\n') + '\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = name => process.argv[process.argv.indexOf(name) + 1];
  if (!process.argv.includes('--snapshot') || !process.argv.includes('--out')) {
    throw new Error('Usage: node scripts/backfill-live-device-seo.mjs --snapshot <D1-export.sql> --out <file-prefix>');
  }
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync(arg('--snapshot'), 'utf8'));
    const inventory = db.prepare(`SELECT d.id,d.brand_name,d.device_name,d.device_slug,d.device_category,d.status,
      CASE WHEN d.status='published' AND SUM(w.status='published')>0 THEN SUM(w.status='published') ELSE COUNT(*) END AS wallpaper_count,
      GROUP_CONCAT(DISTINCT w.file_format) AS file_formats
      FROM w_devices d JOIN w_wallpapers w ON w.device_id=d.id
      WHERE w.media_type='dynamic' AND w.deletion_state='none'
        AND EXISTS (SELECT 1 FROM w_wallpapers live WHERE live.device_id=d.id AND live.media_type='dynamic' AND live.origin_key LIKE 'live/%')
      GROUP BY d.id ORDER BY d.brand_name,d.device_name`).all();
    const catalog = JSON.parse(readFileSync(new URL('../src/data/livewalls/catalog.json', import.meta.url), 'utf8'));
    for (const entry of catalog) {
      if (!inventory.some(device => device.brand_name === entry.category && device.device_slug === entry.collection.slug)) {
        throw new Error(`Live catalog collection missing in snapshot: ${entry.category}/${entry.collection.slug}`);
      }
    }
    const rows = inventory.flatMap(buildLiveDeviceSeoRows);
    const prefix = resolve(arg('--out'));
    mkdirSync(dirname(prefix), { recursive: true });
    writeFileSync(`${prefix}.inventory.json`, JSON.stringify(inventory, null, 2) + '\n');
    writeFileSync(`${prefix}.json`, JSON.stringify(rows, null, 2) + '\n');
    writeFileSync(`${prefix}.sql`, buildLiveInsertSql(rows));
    console.log(JSON.stringify({ collections: inventory.length, rows: rows.length,
      languages: Object.fromEntries(languages.map(language => [language, rows.filter(row => row.language === language).length])), output: prefix }));
  } finally { db.close(); }
}
