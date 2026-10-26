import type { AdminUploadRole } from '@/lib/admin-upload-path';
import type { WallpaperMediaType } from '@/lib/wallpaper-db';

export type UploadFileLike = { name: string; type: string; size: number };
export type AdminUploadInput<F extends UploadFileLike = File> = { file: F; role: AdminUploadRole };
export type AdminPairIssue<F extends UploadFileLike = File> = {
  code: 'duplicate-origin' | 'duplicate-cover' | 'duplicate-preview' | 'orphan' | 'unsupported' | 'preview-mismatch';
  stem: string; files: F[];
};
export type AdminPairedUpload<F extends UploadFileLike = File> = {
  stem: string; origin: F; preview?: F; videoPreview?: F; mediaType: WallpaperMediaType;
  issues: ('missing-cover' | 'preview-mismatch')[];
};
const imageMimes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif' };
export function adminUploadFileMime(file: UploadFileLike): string {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return file.type && file.type !== 'application/octet-stream' ? file.type : extension === 'mp4' ? 'video/mp4' : imageMimes[extension] || '';
}
function validFile(file: UploadFileLike, role: AdminUploadRole): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = adminUploadFileMime(file);
  const image = !!imageMimes[extension] && imageMimes[extension] === mime;
  const video = extension === 'mp4' && mime === 'video/mp4';
  return file.size > 0 && file.size <= (video ? 200 : 50) * 1024 * 1024 &&
    (role === 'origin' ? image || video : role === 'compress' ? image : video);
}
export function isAdminUploadIgnoredFile(file: Pick<UploadFileLike, 'name'>): boolean {
  return /^(?:\.DS_Store|\._)/.test(file.name) || /\.(?:txt|md|json)$/i.test(file.name);
}
export function pairAdminUploadFiles<F extends UploadFileLike>(inputs: readonly AdminUploadInput<F>[]): {
  items: AdminPairedUpload<F>[]; issues: AdminPairIssue<F>[]; ignored: number;
} {
  const groups = new Map<string, { origin: F[]; compress: F[]; preview: F[] }>();
  const issues: AdminPairIssue<F>[] = [];
  let ignored = 0;
  for (const { file, role } of inputs) {
    if (isAdminUploadIgnoredFile(file)) { ignored++; continue; }
    const stem = file.name.replace(/\.[^.]+$/, '');
    if (!validFile(file, role)) { issues.push({ code: 'unsupported', stem, files: [file] }); continue; }
    let group = groups.get(stem);
    if (!group) { group = { origin: [], compress: [], preview: [] }; groups.set(stem, group); }
    // Re-selecting the same file is harmless; distinct names/extensions remain conflicts.
    if (!group[role].some(existing => existing === file)) group[role].push(file);
  }
  const items: AdminPairedUpload<F>[] = [];
  for (const [stem, group] of Array.from(groups)) {
    const all = [...group.origin, ...group.compress, ...group.preview];
    if (!group.origin.length) { issues.push({ code: 'orphan', stem, files: all }); continue; }
    if (group.origin.length > 1) { issues.push({ code: 'duplicate-origin', stem, files: all }); continue; }
    if (group.compress.length > 1) { issues.push({ code: 'duplicate-cover', stem, files: all }); continue; }
    if (group.preview.length > 1) { issues.push({ code: 'duplicate-preview', stem, files: all }); continue; }
    const origin = group.origin[0];
    const mediaType = adminUploadFileMime(origin) === 'video/mp4' ? 'dynamic' : 'static';
    const item: AdminPairedUpload<F> = { stem, origin, preview: group.compress[0], videoPreview: group.preview[0], mediaType, issues: [] };
    if (!item.preview) item.issues.push('missing-cover');
    if (item.videoPreview && (mediaType !== 'dynamic' || item.videoPreview.name !== origin.name)) item.issues.push('preview-mismatch');
    items.push(item);
  }
  return { items, issues, ignored };
}

export function successfulAdminUploadIds(rows: readonly { state: string; wallpaperId?: string; selected?: boolean; isPublished?: boolean }[]): string[] {
  return Array.from(new Set(rows.filter(row => row.state === 'done' && row.selected !== false && !row.isPublished && row.wallpaperId).map(row => row.wallpaperId!)));
}

export function adminUploadRetryPolicy(grants: readonly { expiresAt?: number }[], anyUploaded: boolean, now = Date.now()): 'reuse' | 'renew' | 'reconcile' {
  return grants.some(grant => grant.expiresAt !== undefined && grant.expiresAt <= now)
    ? anyUploaded ? 'reconcile' : 'renew' : 'reuse';
}
