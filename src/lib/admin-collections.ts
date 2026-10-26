import { getWallpaperDb, type DeviceRow, type WallpaperRow, type WallpaperMediaType } from '@/lib/wallpaper-db';
import { assertText } from '@/lib/admin-data';
import { headR2Object } from '@/lib/r2-upload';

// Canonical content is compared again by SQLite inside the same D1 batch as the writes.
// Include full asset fields, not timestamps alone: imports and edits may share timestamps.
const stateSql = `SELECT json_object('device', json((SELECT json_object('id',id,'status',status,'updated_date',updated_date,'deletion_state',deletion_state) FROM w_devices WHERE id = ?)),
  'wallpapers', json((SELECT json_group_array(json_object('id',id,'name',name,'mime_type',mime_type,'size_bytes',size_bytes,'origin_key',origin_key,
    'compress_key',compress_key,'width',width,'height',height,'file_format',file_format,'theme',theme,'media_type',media_type,'category',category,
    'is_primary',is_primary,'tags',tags,'status',status,'updated_date',updated_date,'deletion_state',deletion_state))
    FROM (SELECT * FROM w_wallpapers WHERE device_id = ? ORDER BY id))),
  'locks', json((SELECT json_group_array(json_object('media_type',media_type,'deletion_state',deletion_state,'updated_date',updated_date))
    FROM (SELECT * FROM w_collection_deletions WHERE device_id = ? ORDER BY media_type)))) AS state`;

function ids(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 1000 || value.some(id => typeof id !== 'string' || !id || id.length > 80) || new Set(value).size !== value.length) throw new Error('请明确选择要发布的素材 ID');
  return [...value].sort();
}
function mediaType(value: unknown): WallpaperMediaType {
  if (value !== 'static' && value !== 'dynamic') throw new Error('媒体类型无效');
  return value;
}
async function state(deviceId: string) {
  const row = await getWallpaperDb().prepare(stateSql).bind(deviceId,deviceId,deviceId).first<{state: string}>();
  const canonical = row!.state;
  const parsed = JSON.parse(canonical) as {device: DeviceRow | null; wallpapers: WallpaperRow[]; locks: Array<{media_type: string}>};
  if (!parsed.device) throw new Error('设备不存在');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  const snapshot = Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2,'0')).join('');
  return { ...parsed, device: parsed.device, canonical, snapshot };
}
export type AdminCollectionCheckOptions = {wallpaper_ids?: unknown; media_type?: unknown; operation?: string};
export async function checkAdminCollection(deviceId: string, options: AdminCollectionCheckOptions = {}) {
  const current = await state(assertText(deviceId,'设备 ID',80));
  const all = current.wallpapers;
  const selected = options.wallpaper_ids !== undefined ? ids(options.wallpaper_ids)
    : all.filter(row => (options.media_type === undefined || row.media_type === mediaType(options.media_type)) &&
      (options.operation === 'unpublish' ? row.status === 'published' : row.status !== 'published')).map(row=>row.id).sort();
  const rows = all.filter(row=>selected.includes(row.id));
  if (rows.length !== selected.length) throw new Error('选中的素材不属于当前设备或已删除');
  const issues: Array<{code: string;message: string;wallpaper_id?: string;category?: string;media_type?: WallpaperMediaType}> = [];
  if (current.device.deletion_state !== 'none') issues.push({code:'deletion_lock',message:'设备正在删除或等待重试'});
  const groups = Array.from(new Set(rows.map(row=>`${row.category}/${row.media_type}`))).map(key=>{
    const group = rows.filter(row=>`${row.category}/${row.media_type}`===key);
    const {category,media_type} = group[0];
    const published = all.filter(row=>row.category===category && row.media_type===media_type && row.status==='published' && row.is_primary===1 && row.deletion_state==='none');
    const primary = group.filter(row=>row.is_primary===1 && row.deletion_state==='none');
    if (current.locks.some(lock=>lock.media_type===media_type)) issues.push({code:'deletion_lock',category,media_type,message:'合集正在删除或等待重试'});
    const requires_primary = !published.length && !primary.length;
    if (requires_primary && options.operation !== 'unpublish') issues.push({code:'primary_required',category,media_type,message:'该分类与媒体类型需要已发布主图或选中主图'});
    return {category,media_type,wallpaper_ids:group.map(row=>row.id),primary_ids:primary.map(row=>row.id),published_primary_ids:published.map(row=>row.id),requires_primary};
  });
  if (options.operation !== 'unpublish') {
    for (const group of groups) {
      for (const id of group.published_primary_ids.filter(id => !selected.includes(id))) {
        const primary = all.find(row => row.id === id)!;
        const [origin, cover] = await Promise.all([headR2Object(primary.origin_key), primary.compress_key ? headR2Object(primary.compress_key) : null]);
        if (!origin || !cover || origin.size !== primary.size_bytes || origin.mimeType !== primary.mime_type) {
          group.requires_primary = true;
          issues.push({code:'primary_required',category:group.category,media_type:group.media_type,message:'已发布主图的 R2 文件缺失或无效，请选择本批素材作为主图'});
        }
      }
    }
  }
  for (const row of rows) {
    if (row.deletion_state !== 'none') issues.push({code:'deletion_lock',wallpaper_id:row.id,message:'素材正在删除或等待重试'});
    if (options.operation === 'unpublish') continue;
    if (!row.compress_key) { issues.push({code:'missing_preview',wallpaper_id:row.id,message:'素材缺少预览图或封面'}); continue; }
    const [origin,cover] = await Promise.all([headR2Object(row.origin_key),headR2Object(row.compress_key)]);
    if (!origin || !cover || origin.size!==row.size_bytes || origin.mimeType!==row.mime_type) issues.push({code:'invalid_file',wallpaper_id:row.id,message:'R2 文件不存在或大小、类型与记录不一致'});
  }
  const selectedMedia = new Set(rows.map(row=>row.media_type));
  const other = all.filter(row=>row.status==='published' && row.deletion_state==='none' && !selectedMedia.has(row.media_type));
  const other_media_visibility = {static:other.filter(row=>row.media_type==='static').length,dynamic:other.filter(row=>row.media_type==='dynamic').length};
  return {total:all.length,published:all.filter(row=>row.status==='published').length,pending:all.filter(row=>row.status!=='published').length,
    missing_preview:all.filter(row=>!row.compress_key).length,primary_count:all.filter(row=>row.is_primary && row.deletion_state==='none').length,
    published_primary:all.filter(row=>row.is_primary && row.status==='published' && row.deletion_state==='none').length,
    snapshot:current.snapshot,wallpaper_ids:selected,groups,issues,other_media_visibility,
    requires_visibility_acknowledgement:current.device.status!=='published' && other.length>0,
    device_status:current.device.status};
}
async function checkedState(input: Record<string,unknown>, options: AdminCollectionCheckOptions) {
  const deviceId = assertText(input.device_id,'设备 ID',80);
  const check = await checkAdminCollection(deviceId,options);
  if (input.snapshot!==check.snapshot) throw new Error('设备或素材已变更，请重新检查后确认');
  const current = await state(deviceId);
  if (current.snapshot!==check.snapshot) throw new Error('设备或素材已变更，请重新检查后确认');
  return {deviceId,check,current};
}
function transactionGuard(deviceId: string, canonical: string) {
  // Invalid JSON deliberately aborts the batch on a stale snapshot, rolling back every write.
  return getWallpaperDb().prepare(`SELECT CASE WHEN (${stateSql}) = ? THEN 1 ELSE json('collection snapshot changed') END`)
    .bind(deviceId,deviceId,deviceId,canonical);
}
async function applyCollectionTransaction(statements: D1PreparedStatement[]) {
  try { await getWallpaperDb().batch(statements); }
  catch (error) {
    if (error instanceof Error && /malformed JSON/i.test(error.message)) throw new Error('设备或素材已变更，请重新检查后确认');
    throw error;
  }
}
export async function publishAdminCollection(input: Record<string,unknown>) {
  const selected = ids(input.wallpaper_ids);
  const {deviceId,check,current} = await checkedState(input,{wallpaper_ids:selected});
  const primaryIds = input.primary_ids === undefined || (Array.isArray(input.primary_ids) && input.primary_ids.length===0) ? [] : ids(input.primary_ids);
  if (primaryIds.some(id=>!selected.includes(id))) throw new Error('主图必须属于本次选中素材');
  if (check.issues.some(issue=>issue.code!=='primary_required')) throw new Error(check.issues.filter(issue=>issue.code!=='primary_required').map(issue=>issue.message).join('；'));
  for (const group of check.groups) {
    const chosen = primaryIds.filter(id=>group.wallpaper_ids.includes(id));
    if (chosen.length>1 || (group.requires_primary && !chosen.length)) throw new Error('每个分类与媒体类型必须选择一张有效主图');
  }
  if (current.device.status!=='published' && input.make_device_visible!==true) throw new Error('请确认打开设备可见状态');
  if (check.requires_visibility_acknowledgement && input.acknowledge_other_media_visibility!==true) throw new Error('请确认另一种媒体类型的已发布素材也将恢复可见');
  const db = getWallpaperDb(), now = Math.max(Date.now(),current.device.updated_date+1);
  const statements = [transactionGuard(deviceId,current.canonical)];
  for (const id of primaryIds) {
    const row = current.wallpapers.find(row=>row.id===id)!;
    statements.push(db.prepare('UPDATE w_wallpapers SET is_primary=0,updated_date=? WHERE device_id=? AND category=? AND media_type=? AND is_primary=1').bind(now,deviceId,row.category,row.media_type));
    statements.push(db.prepare('UPDATE w_wallpapers SET is_primary=1,updated_date=? WHERE id=?').bind(now,id));
  }
  statements.push(db.prepare("UPDATE w_wallpapers SET status='published',updated_date=? WHERE device_id=? AND id IN (SELECT value FROM json_each(?))").bind(now,deviceId,JSON.stringify(selected)));
  if (input.make_device_visible===true) statements.push(db.prepare("UPDATE w_devices SET status='published',updated_date=? WHERE id=?").bind(now,deviceId));
  await applyCollectionTransaction(statements);
  return {device_id:deviceId,wallpaper_ids:selected,published:selected.length};
}
export async function unpublishAdminCollection(input: Record<string,unknown>) {
  const media = mediaType(input.media_type);
  const {deviceId,check,current} = await checkedState(input,{media_type:media,operation:'unpublish'});
  if (check.issues.length || current.locks.some(lock=>lock.media_type===media)) throw new Error('设备或合集正在删除，无法下架');
  const db=getWallpaperDb();
  await applyCollectionTransaction([transactionGuard(deviceId,current.canonical),db.prepare("UPDATE w_wallpapers SET status='unpublished',updated_date=? WHERE device_id=? AND media_type=? AND status='published'").bind(Date.now(),deviceId,media)]);
  return {device_id:deviceId,media_type:media,wallpaper_ids:check.wallpaper_ids,unpublished:check.wallpaper_ids.length};
}
