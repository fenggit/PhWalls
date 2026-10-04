import { localizeDeviceName } from './device-localization.mjs';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const languages = ['en', 'zh', 'ja', 'vi', 'zh-hant'];

export function classifyCollection(device) {
  const name = device.device_name;
  if (/Surface Duo.*Neo/i.test(name)) return 'mixed';
  if (/Surface Duo/i.test(name)) return 'fold';
  if (/Mobile Phone|for Phone|Windows Phone/i.test(name)) return 'phone';
  if (/\bDesktop\b|MateBook|Laptop|Notebook|Chromebook|Pixelbook|Surface (Book|Pro|Go|Studio|Hub|RT)/i.test(name)) return 'desktop';
  if (/MatePad|\b(?:Pad|Tab|Tablet)\b/i.test(name)) return 'pad';
  return ({ desktop: 'desktop', pad: 'pad', phone_fold: 'fold', os: 'system' })[device.device_category] || 'phone';
}

const styleWords = {
  gradient: { en: 'gradients', zh: '渐变图案', ja: 'グラデーション', vi: 'màu chuyển sắc', 'zh-hant': '漸層圖案' },
  abstract: { en: 'abstract designs', zh: '抽象图案', ja: '抽象的なデザイン', vi: 'thiết kế trừu tượng', 'zh-hant': '抽象圖案' },
  photo: { en: 'photographic backgrounds', zh: '摄影背景', ja: '写真の壁紙', vi: 'ảnh chụp', 'zh-hant': '攝影背景' },
  geometric: { en: 'geometric patterns', zh: '几何图案', ja: '幾何学模様', vi: 'họa tiết hình học', 'zh-hant': '幾何圖案' },
  texture: { en: 'textures', zh: '纹理图案', ja: 'テクスチャ', vi: 'họa tiết bề mặt', 'zh-hant': '紋理圖案' },
};
const colorWords = {
  black: { en: 'black', zh: '黑色', ja: 'ブラック', vi: 'đen', 'zh-hant': '黑色' },
  blue: { en: 'blue', zh: '蓝色', ja: 'ブルー', vi: 'xanh dương', 'zh-hant': '藍色' },
  gray: { en: 'grey', zh: '灰色', ja: 'グレー', vi: 'xám', 'zh-hant': '灰色' },
  silver: { en: 'silver', zh: '银色', ja: 'シルバー', vi: 'bạc', 'zh-hant': '銀色' },
  white: { en: 'white', zh: '白色', ja: 'ホワイト', vi: 'trắng', 'zh-hant': '白色' },
  green: { en: 'green', zh: '绿色', ja: 'グリーン', vi: 'xanh lá', 'zh-hant': '綠色' },
  pink: { en: 'pink', zh: '粉色', ja: 'ピンク', vi: 'hồng', 'zh-hant': '粉紅色' },
  red: { en: 'red', zh: '红色', ja: 'レッド', vi: 'đỏ', 'zh-hant': '紅色' },
  brown: { en: 'brown', zh: '棕色', ja: 'ブラウン', vi: 'nâu', 'zh-hant': '棕色' },
  purple: { en: 'purple', zh: '紫色', ja: 'パープル', vi: 'tím', 'zh-hant': '紫色' },
  orange: { en: 'orange', zh: '橙色', ja: 'オレンジ', vi: 'cam', 'zh-hant': '橙色' },
  beige: { en: 'beige', zh: '米色', ja: 'ベージュ', vi: 'be', 'zh-hant': '米色' },
};

function joinWords(words, language) {
  if (words.length < 2) return words[0] || '';
  return words.join(({ en: ' and ', zh: '与', ja: 'や', vi: ' và ', 'zh-hant': '與' })[language]);
}

function collectionFeatures(device, language) {
  const slugify = (value) => String(value || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const author = device.device_name.match(/\b(?:made|created) by (?:canvas )?(.+)$/i)?.[1];
  const prefixes = [device.device_slug, slugify(device.device_name), slugify(device.device_name.replace(/ \(\d+\)$/, '')),
    author ? slugify(author) : ''].filter(Boolean).sort((left, right) => right.length - left.length);
  const names = (device.asset_names || '').split('|').map((value) => {
    let suffix = slugify(value);
    for (const prefix of prefixes) {
      if (suffix === prefix) { suffix = ''; break; }
      if (suffix.startsWith(`${prefix}-`)) { suffix = suffix.slice(prefix.length + 1); break; }
    }
    return suffix;
  }).join('|');
  const countToken = (token) => (names.match(new RegExp(`(?:^|[^a-z0-9])${token}(?=$|[^a-z0-9])`, 'g')) || []).length;
  const styles = Object.keys(styleWords).map((key) => [key, countToken(key)])
    .filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key]) => styleWords[key][language]);
  const colors = Object.keys(colorWords).map((key) => [key, countToken(key)])
    .filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key]) => colorWords[key][language]);
  const style = joinWords(styles, language);
  const color = joinWords(colors, language);
  const both = device.dark_count > 0 && device.light_count > 0;
  const dark = device.dark_count > 0;
  const light = device.light_count > 0;
  const theme = both
    ? ({ en: 'light and dark versions', zh: '深浅色版本', ja: 'ライト版とダーク版', vi: 'phiên bản sáng và tối', 'zh-hant': '深淺色版本' })[language]
    : dark ? ({ en: device.dark_count === 1 ? 'a dark option' : 'dark options', zh: '深色版本', ja: 'ダーク版', vi: 'phiên bản tối', 'zh-hant': '深色版本' })[language]
      : light ? ({ en: device.light_count === 1 ? 'a light option' : 'light options', zh: '浅色版本', ja: 'ライト版', vi: 'phiên bản sáng', 'zh-hant': '淺色版本' })[language] : '';
  const themes = ['catppuccin', 'gruvbox', 'nord', 'tokyo-night', 'rose-pine', 'everforest', 'kanagawa']
    .filter((key) => names.includes(key)).slice(0, 2).map((key) => ({ 'tokyo-night': 'Tokyo Night', 'rose-pine': 'Rose Pine' })[key]
      || key.charAt(0).toUpperCase() + key.slice(1));
  if (device.brand_name === 'omarchy-linux' && themes.length) {
    const list = joinWords(themes, language);
    return ({ en: `Includes ${list} theme backgrounds.`, zh: `包含${list}等主题背景。`,
      ja: `${list}などのテーマ背景を収録。`, vi: `Có ảnh nền theo chủ đề ${list}.`, 'zh-hant': `收錄${list}等主題背景。` })[language];
  }
  switch (language) {
    case 'en': return [style ? `Includes ${style}.` : '', color && !theme ? `Colors include ${color}.` : '', theme ? `Includes ${theme}.` : ''].filter(Boolean).join(' ');
    case 'zh': return [style ? `包含${style}。` : '', color && !theme ? `可选${color}等配色。` : '', theme ? `${both ? '可对比' : '包含'}${theme}。` : ''].join('');
    case 'ja': return [style ? `${style}を収録。` : '', color && !theme ? `${color}などの配色から選べます。` : '', theme ? `${theme}${both ? 'を見比べられます' : 'も含まれます'}。` : ''].join('');
    case 'vi': return [style ? `Bộ sưu tập có ${style}.` : '', color && !theme ? `Các tông màu gồm ${color}.` : '', theme ? `Có ${theme} để lựa chọn.` : ''].filter(Boolean).join(' ');
    case 'zh-hant': return [style ? `收錄${style}。` : '', color && !theme ? `配色包括${color}等。` : '', theme ? `${both ? '可比較' : '含'}${theme}。` : ''].join('');
  }
}

const uses = {
  phone: { en: 'your home or lock screen', zh: '手机主屏幕或锁屏', ja: 'ホーム画面やロック画面', vi: 'màn hình điện thoại', 'zh-hant': '手機主畫面或鎖定畫面' },
  fold: { en: 'a foldable phone background', zh: '折叠屏手机背景', ja: '折りたたみスマートフォンの背景', vi: 'màn hình điện thoại gập', 'zh-hant': '摺疊手機螢幕' },
  pad: { en: 'your tablet background', zh: '平板桌面背景', ja: 'タブレットの背景', vi: 'máy tính bảng', 'zh-hant': '平板螢幕' },
  desktop: { en: 'your desktop background', zh: '电脑桌面背景', ja: 'デスクトップ背景', vi: 'màn hình máy tính', 'zh-hant': '電腦桌面' },
  system: { en: 'a new screen background', zh: '屏幕背景', ja: '画面の背景', vi: 'màn hình của bạn', 'zh-hant': '螢幕' },
  mixed: { en: 'a new screen background', zh: '不同屏幕的背景', ja: '画面の背景', vi: 'màn hình của bạn', 'zh-hant': '不同螢幕' },
};

export function buildDeviceSeoRows(device) {
  if (!device.id || !device.device_name || !Number.isInteger(device.wallpaper_count) || device.wallpaper_count < 1) {
    throw new Error(`Invalid collection inventory: ${device.id}`);
  }
  const model = device.device_name.trim().replace(/\s+wallpapers$/i, '').replace(/\s+/g, ' ');
  const kind = classifyCollection(device);
  const count = device.wallpaper_count;
  const formats = [...new Set((device.file_formats || '').split(',').filter(Boolean).map((value) =>
    value.toLowerCase() === 'jpeg' ? 'JPG' : value.toUpperCase()))].sort().join('/');
  const resolution = device.min_width > 0 && device.min_height > 0 && device.min_width === device.max_width && device.min_height === device.max_height
    ? `${device.min_width}×${device.min_height}` : '';
  return languages.map((language) => {
    const feature = collectionFeatures(device, language);
    const use = uses[kind][language];
    const localName = localizeDeviceName(device.brand_name, model, language);
    let name;
    let desc;
    switch (language) {
      case 'en':
        name = `${localName}${kind === 'desktop' && !/\bDesktop\b/i.test(model) ? ' Desktop' : ''} Wallpapers`;
        desc = `Browse ${count} ${localName} ${count === 1 ? 'wallpaper' : 'wallpapers'} for ${use}. ${feature} Preview the collection and download ${resolution ? `${resolution} ` : ''}${formats} originals for free.`;
        break;
      case 'zh':
        name = `${localName} ${kind === 'desktop' ? '桌面壁纸' : '壁纸'}`;
        desc = `收录${count}张${localName}壁纸。${feature}先预览画面，再免费下载${resolution ? `${resolution}像素的` : ''}${formats}原图，为${use}选择喜欢的配色。`;
        break;
      case 'ja':
        name = `${localName}の${kind === 'desktop' ? 'デスクトップ壁紙' : '壁紙'}`;
        desc = `${localName}の壁紙${count}枚を無料ダウンロード。${feature}画像をプレビューしてから、${resolution ? `${resolution}ピクセルの` : ''}${formats}の元画像を保存できます。${use}に使う1枚を選べます。`;
        break;
      case 'vi':
        name = `Hình nền ${kind === 'desktop' ? 'máy tính ' : ''}${localName}`;
        desc = `Tải miễn phí ${count} hình nền ${localName}. ${feature} ${resolution ? `Ảnh gốc ${resolution} px, định dạng` : 'Định dạng ảnh gốc'} ${formats}. Xem trước bộ sưu tập và chọn ảnh gốc cho ${use}.`;
        break;
      case 'zh-hant':
        name = `${localName} ${kind === 'desktop' ? '桌面桌布' : '桌布'}`;
        desc = `${localName}桌布共${count}張，可先看預覽再下載原圖。${feature}${resolution ? `原圖尺寸為${resolution}，` : ''}提供${formats}檔案，挑選適合${use}的背景圖片。`;
        break;
    }
    desc = desc.replace(/\s+/g, ' ').trim();
    if (name.length > 200 || desc.length > 5000) throw new Error(`Copy exceeds schema limit: ${device.id}/${language}`);
    return { id: createHash('sha256').update(`phwalls-device-seo-v1:${device.id}:${language}`).digest('hex').slice(0, 32),
      device_id: device.id, language, display_name: localName, seo_title: name, description: desc };
  });
}

const quote = (value) => value === null || value === undefined ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
export function buildInsertSql(rows, timestamp = Date.now()) {
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) throw new Error('Invalid timestamp');
  return rows.map((row) => `INSERT INTO w_device_i18n (id,device_id,display_name,seo_title,description,language,create_date,updated_date)
SELECT ${[row.id, row.device_id, row.display_name, row.seo_title, row.description, row.language].map(quote).join(',')},${timestamp},${timestamp}
WHERE EXISTS (SELECT 1 FROM w_devices WHERE id=${quote(row.device_id)})
ON CONFLICT (device_id,language) DO NOTHING;`).join('\n') + '\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const directory = resolve(root, 'docs/research/device-seo-2026-10-02');
  const inventory = JSON.parse(await readFile(resolve(directory, 'inventory.json'), 'utf8'));
  const rows = inventory.flatMap(buildDeviceSeoRows);
  if (new Set(rows.map((row) => `${row.device_id}/${row.language}`)).size !== rows.length) throw new Error('Duplicate device/language rows');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'device-seo-records.json'), JSON.stringify(rows, null, 2) + '\n');
  await writeFile(resolve(directory, 'device-seo-backfill.sql'), buildInsertSql(rows));
  const summary = Object.fromEntries(languages.map((language) => {
    const localized = rows.filter((row) => row.language === language);
    return [language, { rows: localized.length, minDescriptionLength: Math.min(...localized.map((row) => row.description.length)),
      maxDescriptionLength: Math.max(...localized.map((row) => row.description.length)) }];
  }));
  await writeFile(resolve(directory, 'copy-summary.json'), JSON.stringify({ devices: inventory.length, rows: rows.length, languages: summary }, null, 2) + '\n');
  console.log(JSON.stringify({ devices: inventory.length, rows: rows.length, languages: summary }, null, 2));
}
