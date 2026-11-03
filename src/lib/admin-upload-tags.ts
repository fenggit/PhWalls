import vocabulary from '@/data/language/en/wallpaper-tags.json';

type TagReportFile = { name: string; webkitRelativePath: string; size?: number; text(): Promise<string> };

export function mergeAdminUploadTags(current: string, tags: readonly string[]): string {
  const merged = Array.from(new Set([...current.split(/[,，]/).map(tag => tag.trim()).filter(Boolean), ...tags]));
  if (merged.length > 20 || merged.some(tag => tag.length > 40)) throw new Error('合并后的标签超过 20 项或单项超过 40 字符，请调整批量标签或标签报告');
  return merged.join(', ');
}

/** Reports are local metadata only; keys are exact original filenames, never stems. */
export async function readAdminUploadTags(files: readonly TagReportFile[], folder: string): Promise<Map<string, string[]>> {
  const reports = files.filter(file => file.webkitRelativePath === `${folder}/${file.name}`);
  const json = reports.find(file => file.name === 'wallpaper-tags.json');
  const report = json || reports.find(file => file.name === 'wallpaper-tags.md');
  const result = new Map<string, string[]>();
  if (!report) return result;
  const fail = () => new Error(`${report.name} 格式错误：请检查原文件路径、重复条目及英文标签`);
  if (report.size !== undefined && report.size > 5 * 1024 * 1024) throw new Error(`${report.name} 超过 5 MB，请精简标签报告`);
  const add = (path: unknown, tags: unknown) => {
    if (typeof path !== 'string' || !Array.isArray(tags) || !tags.length || tags.length > 20 ||
      tags.some(tag => typeof tag !== 'string' || tag.length > 40 || !Object.prototype.hasOwnProperty.call(vocabulary, tag)) || new Set(tags).size !== tags.length) throw fail();
    const relative = path.startsWith(`${folder}/`) ? path.slice(folder.length + 1) : path;
    const name = relative.startsWith('origin/') ? relative.slice(7) : relative;
    if (!name || /[/\\]/.test(name) || name === '.' || name === '..' || !/\.(?:jpe?g|png|webp|avif|gif|mp4)$/i.test(name) || result.has(name)) throw fail();
    result.set(name, tags as string[]);
  };
  const text = (await report.text()).replace(/^\uFEFF/, '');
  if (json) {
    let data: unknown;
    try { data = JSON.parse(text); } catch { throw fail(); }
    if (!Array.isArray(data)) throw fail();
    for (const row of data) {
      if (!row || typeof row !== 'object' || row.model !== folder || !Array.isArray(row.tags) ||
        (row.tags_text !== undefined && row.tags_text !== row.tags.join(', '))) throw fail();
      add(row.origin, row.tags);
    }
  } else {
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim().startsWith('|')) continue;
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim().replace(/^`|`$/g, ''));
      if (!/\.(?:jpe?g|png|webp|avif|gif|mp4)$/i.test(cells[0] || '')) continue;
      if (cells.length !== 3) throw fail();
      add(cells[0], cells[2].split(',').map(tag => tag.trim()).filter(Boolean));
    }
    if (!result.size) throw fail();
  }
  return result;
}
