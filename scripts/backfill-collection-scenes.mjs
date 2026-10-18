import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const languages = ['en', 'zh', 'ja', 'vi', 'zh-hant'];
const tables = { static: 'w_device_i18n', dynamic: 'w_live_device_i18n' };
const dictionaries = Object.fromEntries(languages.map(language => [language, {
  copy: JSON.parse(readFileSync(new URL(`../src/data/language/${language}/discovery.json`, import.meta.url))),
  tags: JSON.parse(readFileSync(new URL(`../src/data/language/${language}/wallpaper-tags.json`, import.meta.url))),
}]));
const quote = value => value == null ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;

// Only the exact vocabulary used by the old generator is disposable. A sentence
// inserted by an editor between the generated opening and footer must survive.
function generatedFeatures(value, language) {
  const styles = {
    en: 'gradients|abstract designs|photographic backgrounds|geometric patterns|textures',
    zh: '渐变图案|抽象图案|摄影背景|几何图案|纹理图案',
    ja: 'グラデーション|抽象的なデザイン|写真の壁紙|幾何学模様|テクスチャ',
    vi: 'màu chuyển sắc|thiết kế trừu tượng|ảnh chụp|họa tiết hình học|họa tiết bề mặt',
    'zh-hant': '漸層圖案|抽象圖案|攝影背景|幾何圖案|紋理圖案',
  };
  const colors = {
    en: 'black|blue|grey|silver|white|green|pink|red|brown|purple|orange|beige',
    zh: '黑色|蓝色|灰色|银色|白色|绿色|粉色|红色|棕色|紫色|橙色|米色',
    ja: 'ブラック|ブルー|グレー|シルバー|ホワイト|グリーン|ピンク|レッド|ブラウン|パープル|オレンジ|ベージュ',
    vi: 'đen|xanh dương|xám|bạc|trắng|xanh lá|hồng|đỏ|nâu|tím|cam|be',
    'zh-hant': '黑色|藍色|灰色|銀色|白色|綠色|粉紅色|紅色|棕色|紫色|橙色|米色',
  };
  const separator = { en: ' and ', zh: '与', ja: 'や', vi: ' và ', 'zh-hant': '與' }[language];
  const pair = words => `(?:${words})(?:${separator}(?:${words}))?`;
  const style = pair(styles[language]), color = pair(colors[language]);
  const themes = pair('Catppuccin|Gruvbox|Nord|Tokyo Night|Rose Pine|Everforest|Kanagawa');
  const clauses = {
    en: [`Includes ${style}\\.`, `Colors include ${color}\\.`, 'Includes (?:light and dark versions|a dark option|dark options|a light option|light options)\\.', `Includes ${themes} theme backgrounds\\.`],
    zh: [`包含${style}。`, `可选${color}等配色。`, '(?:可对比深浅色版本|包含(?:深色|浅色)版本)。', `包含${themes}等主题背景。`],
    ja: [`${style}を収録。`, `${color}などの配色から選べます。`, '(?:ライト版とダーク版を見比べられます|(?:ダーク版|ライト版)も含まれます)。', `${themes}などのテーマ背景を収録。`],
    vi: [`Bộ sưu tập có ${style}\\.`, `Các tông màu gồm ${color}\\.`, 'Có (?:phiên bản sáng và tối|phiên bản tối|phiên bản sáng) để lựa chọn\\.', `Có ảnh nền theo chủ đề ${themes}\\.`],
    'zh-hant': [`收錄${style}。`, `配色包括${color}等。`, '(?:可比較深淺色版本|含(?:深色|淺色)版本)。', `收錄${themes}等主題背景。`],
  }[language];
  return new RegExp(`^(?:\\s*(?:${clauses.join('|')}))*\\s*$`).test(value);
}

// Narrow signatures of previously generated copy. Bespoke editorial paragraphs stay intact.
export function isGeneratedDescription(value, language, media) {
  if (!value?.trim()) return true;
  // Old mixed-media imports appended a generated count sentence. These counts
  // became stale when static and live collections split; they are not editorial copy.
  value = value.replace(({
    en: / Includes \d+ static wallpapers and \d+ MP4 live wallpapers\.$/,
    zh: / 包含\d+张静态壁纸和\d+段MP4动态壁纸。$/,
    ja: / 静止画の壁紙\d+枚とMP4形式のライブ壁紙\d+本を収録。$/,
    vi: / Gồm \d+ hình nền tĩnh và \d+ hình nền động MP4\.$/,
    'zh-hant': / 包含\d+張靜態桌布和\d+段MP4動態桌布。$/,
  })[language], '');
  if (media === 'dynamic') return ({
    en: /^Explore \d+ .+ live wallpapers?\. Play video previews and download the original [A-Z0-9/]+ files for free\. Use a compatible device or wallpaper app to set a video as your (?:desktop|home or lock screen) background\.$/,
    zh: /^收录\d+段.+动态壁纸，支持在线观看视频预览，免费下载原始[A-Z0-9/]+文件。为(?:电脑桌面|手机主屏幕或锁屏)挑选动态背景，设置时需使用支持视频壁纸的设备或应用。$/,
    ja: /^.+のライブ壁紙\d+本を掲載。動画をプレビューして、元の[A-Z0-9/]+ファイルを無料でダウンロードできます。(?:デスクトップ背景|ホーム画面やロック画面)(?:への設定には、|に使う動く背景を選べます。設定には、)動画壁紙に対応した端末またはアプリが必要です。$/,
    vi: /^Khám phá \d+ hình nền động .+\. Xem trước video và tải miễn phí tệp [A-Z0-9/]+ gốc để chọn hình nền cho (?:màn hình máy tính|màn hình chính hoặc màn hình khóa)\. Cần thiết bị hoặc ứng dụng hỗ trợ hình nền video để sử dụng\.$/,
    'zh-hant': /^精選\d+段.+動態桌布，可線上預覽影片，免費下載原始[A-Z0-9/]+檔案。為(?:電腦桌面|手機主畫面或鎖定畫面)挑選動態背景；設定時需使用支援影片桌布的裝置或應用程式。$/,
  })[language].test(value);
  const match = ({
    en: /^Browse .+? wallpapers? for [^.]+\.\s*(.*?)\s*Preview the collection and download .+ originals for free\.$/,
    zh: /^(?:收录\d+张|免费下载).+?壁纸。\s*(.*?)\s*先预览画面，再(?:免费)?下载.+原图，为.+选择喜欢的配色。$/,
    ja: /^.+?の壁紙(?:\d+枚)?を無料ダウンロード。\s*(.*?)\s*画像をプレビューしてから、.+の元画像を保存できます。.+に使う(?:1枚|壁紙)を選べます。$/,
    vi: /^Tải miễn phí (?:\d+ )?hình nền .+?\.\s+(.*?)\s*(?:Ảnh gốc .+? px, định dạng|Định dạng ảnh gốc) [A-Z0-9/]+\. Xem trước bộ sưu tập và chọn ảnh gốc cho .+\.$/,
    'zh-hant': /^.+?桌布(?:共\d+張)?，可先看預覽再下載原圖。\s*(.*?)\s*(?:原圖尺寸為.+?，)?提供.+檔案，挑選適合.+的背景圖片。$/,
  })[language].exec(value);
  return Boolean(match && generatedFeatures(match[1], language));
}

export function buildScenePlan(db, timestamp = Date.now()) {
  if (!Number.isSafeInteger(timestamp) || timestamp < 1) throw new Error('Invalid timestamp');
  const inventory = db.prepare(`SELECT d.*,w.media_type FROM w_devices d JOIN w_wallpapers w ON w.device_id=d.id
    WHERE d.status='published' AND d.deletion_state='none' AND w.status='published' AND w.deletion_state='none'
      AND NOT EXISTS (SELECT 1 FROM w_collection_deletions c WHERE c.device_id=d.id AND c.media_type=w.media_type)
    GROUP BY d.id,w.media_type ORDER BY d.id,w.media_type`).all();
  const changes = [], preserved = [];
  for (const device of inventory) {
    const assets = db.prepare("SELECT * FROM w_wallpapers WHERE device_id=? AND media_type=? AND status='published' AND deletion_state='none' ORDER BY id").all(device.id, device.media_type);
    const fingerprint = assets.map(row => `${row.id}:${row.updated_date}`).join('|');
    const frequencies = new Map();
    for (const row of assets) for (const tag of new Set(JSON.parse(row.tags))) {
      if (tag !== 'live wallpapers' && dictionaries.en.tags[tag]) frequencies.set(tag, (frequencies.get(tag) || 0) + 1);
    }
    const tags = [...frequencies].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([tag]) => tag);
    const categories = [...new Set(assets.map(row => row.category))];
    const scene = categories.length === 1 ? ({ phone: 'phone', phone_fold: 'fold', pad: 'pad', desktop: 'desktop' })[categories[0]] || 'generic' : 'generic';
    for (const language of languages) {
      const table = tables[device.media_type];
      const before = db.prepare(`SELECT * FROM ${table} WHERE device_id=? AND language=?`).get(device.id, language) || null;
      if (before && !isGeneratedDescription(before.description, language, device.media_type)) {
        preserved.push({ device_id: device.id, media: device.media_type, language, description: before.description });
        continue;
      }
      const { copy, tags: labels } = dictionaries[language];
      const cjk = ['zh', 'zh-hant', 'ja'].includes(language);
      const feature = tags.length ? copy.features.replace('{tags}', tags.map(tag => language === 'vi'
        ? labels[tag].toLocaleLowerCase('vi') : labels[tag]).join(cjk ? '、' : ', ')) : '';
      const description = [feature, device.media_type === 'dynamic' ? copy.live : copy[scene]].filter(Boolean).join(cjk ? '' : ' ');
      if (before?.description === description) continue;
      const after = before ? { ...before, description, updated_date: timestamp } : {
        id: createHash('sha256').update(`scene-v1:${device.id}:${device.media_type}:${language}`).digest('hex').slice(0, 32),
        device_id: device.id, language, display_name: null, seo_title: null, description, create_date: timestamp, updated_date: timestamp,
      };
      changes.push({ table, device, fingerprint, tags, before, after });
    }
  }
  return { timestamp, inventory, changes, preserved };
}

export function sceneSql(plan) {
  const apply = [], rollback = [];
  for (const change of plan.changes) {
    const { table, device, fingerprint, before, after } = change;
    const identity = `device_id=${quote(device.id)} AND language=${quote(after.language)}`;
    const guard = `EXISTS (SELECT 1 FROM w_devices d WHERE d.id=${quote(device.id)} AND d.updated_date=${device.updated_date} AND d.status='published' AND d.deletion_state='none')
AND NOT EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id=${quote(device.id)} AND media_type=${quote(device.media_type)})
AND (SELECT GROUP_CONCAT(token,'|') FROM (SELECT id || ':' || updated_date AS token FROM w_wallpapers WHERE device_id=${quote(device.id)} AND media_type=${quote(device.media_type)} AND status='published' AND deletion_state='none' ORDER BY id))=${quote(fingerprint)}`;
    const oldGuard = before ? ['id', 'description', 'updated_date'].map(key => `${key} IS ${quote(before[key])}`).join(' AND ') : '';
    if (before) apply.push(`UPDATE ${table} SET description=${quote(after.description)},updated_date=${plan.timestamp} WHERE ${identity} AND ${oldGuard} AND ${guard};`);
    else {
      const columns = Object.keys(after);
      apply.push(`INSERT INTO ${table}(${columns.join(',')}) SELECT ${columns.map(key => quote(after[key])).join(',')} WHERE ${guard} ON CONFLICT(device_id,language) DO NOTHING;`);
    }
    const exact = Object.keys(after).map(key => `${key} IS ${quote(after[key])}`).join(' AND ');
    rollback.push(before
      ? `UPDATE ${table} SET description=${quote(before.description)},updated_date=${before.updated_date} WHERE ${identity} AND ${exact};`
      : `DELETE FROM ${table} WHERE ${identity} AND ${exact};`);
  }
  return { apply: apply.join('\n') + '\n', rollback: rollback.reverse().join('\n') + '\n' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = name => { const index = process.argv.indexOf(name); if (index < 0 || !process.argv[index + 1]) throw new Error('Usage: --snapshot <D1.sql> --out <prefix>'); return resolve(process.argv[index + 1]); };
  const source = readFileSync(arg('--snapshot'), 'utf8'), prefix = arg('--out');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(source);
    const plan = buildScenePlan(db), sql = sceneSql(plan);
    const read = () => Object.values(tables).map(table => db.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
    const before = JSON.stringify(read());
    db.exec(sql.apply);
    const after = JSON.stringify(read());
    for (const change of plan.changes) {
      const actual = db.prepare(`SELECT * FROM ${change.table} WHERE id=?`).get(change.after.id);
      if (JSON.stringify(actual) !== JSON.stringify(change.after)) throw new Error(`Apply verification failed: ${change.after.id}`);
    }
    db.exec(sql.apply);
    if (JSON.stringify(read()) !== after) throw new Error('Non-idempotent updates');
    db.exec(sql.rollback);
    if (JSON.stringify(read()) !== before) throw new Error('Rollback verification failed');
    mkdirSync(dirname(prefix), { recursive: true });
    writeFileSync(`${prefix}.sql`, sql.apply); writeFileSync(`${prefix}.rollback.sql`, sql.rollback);
    writeFileSync(`${prefix}.changes.json`, JSON.stringify(plan.changes, null, 2));
    writeFileSync(`${prefix}.preserved.json`, JSON.stringify(plan.preserved, null, 2));
    const audit = { timestamp: plan.timestamp, snapshot_sha256: createHash('sha256').update(source).digest('hex'),
      collections: plan.inventory.length, changes: plan.changes.length, preserved: plan.preserved.length,
      languages: Object.fromEntries(languages.map(language => [language, plan.changes.filter(row => row.after.language === language).length])),
      verification: { apply: true, idempotent: true, exact_rollback: true } };
    writeFileSync(`${prefix}.audit.json`, JSON.stringify(audit, null, 2));
    console.log(JSON.stringify(audit, null, 2));
  } finally { db.close(); }
}
