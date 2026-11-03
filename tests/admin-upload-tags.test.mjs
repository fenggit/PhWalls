import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTsLoader } from '../scripts/tests/load-ts.mjs';
const load = createTsLoader();
const get = () => load('src/lib/admin-upload-tags.ts');
const report = (name, text, folder = 'Samsung W27') => ({ name, webkitRelativePath: `${folder}/${name}`, text: async () => text });
const entry = (origin, tags) => ({model: 'Samsung W27', origin, tags, tags_text: tags.join(', ')});
test('JSON wins over Markdown, exact original extension and case are preserved', async () => {
  const map = await get().readAdminUploadTags([report('wallpaper-tags.md', 'broken'), report('wallpaper-tags.json', JSON.stringify([entry('origin/live.MP4',['abstract','live wallpapers']),entry('origin/live.webp',['abstract'])]))], 'Samsung W27');
  assert.equal(map.get('live.MP4').join(', '), 'abstract, live wallpapers');
  assert.equal(map.get('live.webp').join(', '), 'abstract');
  assert.equal(map.has('live.mp4'), false);
});
test('Markdown fallback reads workflow table and ignores its header', async () => {
  const map = await get().readAdminUploadTags([report('wallpaper-tags.md', '# 标签\n## Samsung W27\n| 原始文件名 | 描述 | 英文标签 |\n| --- | --- | --- |\n| live.MP4 | 蓝色 | `abstract, live wallpapers` |')], 'Samsung W27');
  assert.equal(map.get('live.MP4').join(', '), 'abstract, live wallpapers');
});
test('malformed, conflicting, unsafe and invalid tags fail visibly', async () => {
  for (const data of ['{', JSON.stringify([entry('../other.jpg',['abstract'])]), JSON.stringify([entry('origin/a.jpg',['unknown'])]), JSON.stringify([entry('origin/a.jpg',['abstract']),entry('origin/a.jpg',['3d'])])]) {
    await assert.rejects(() => get().readAdminUploadTags([report('wallpaper-tags.json',data)], 'Samsung W27'));
  }
});
test('missing reports leave tags alone, manual and report tags merge without duplicates', async () => {
  assert.equal((await get().readAdminUploadTags([], 'Samsung W27')).size, 0);
  assert.equal(get().mergeAdminUploadTags('abstract, glass', ['abstract','3d']), 'abstract, glass, 3d');
});
test('reports outside selected root are ignored and reports never become media', async () => {
  assert.equal((await get().readAdminUploadTags([{...report('wallpaper-tags.json', '{'), webkitRelativePath:'Samsung W27/origin/wallpaper-tags.json'}], 'Samsung W27')).size, 0);
  const mixed = load('src/lib/admin-mixed-upload.ts');
  const paired = mixed.pairAdminUploadFiles(['wallpaper-tags.json','wallpaper-tags.md'].map(name => ({file: {name,type:'application/json',size:100},role:'origin'})));
  assert.equal(paired.items.length, 0);
  assert.equal(paired.issues.length, 0);
  assert.equal(paired.ignored, 2);
  assert.throws(() => get().mergeAdminUploadTags(Array.from({length:20},(_,i)=>`tag${i}`).join(', '), ['abstract']));
});
