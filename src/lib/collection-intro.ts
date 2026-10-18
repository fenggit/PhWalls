import type { Language } from '@/types';
import type { WallpaperAsset, WallpaperCollection } from '@/lib/wallpaper-data';
import { fillDiscovery, getDiscoveryTexts } from '@/lib/discovery-i18n';

export function wallpaperResolution(item: Pick<WallpaperAsset, 'width' | 'height'>): string | null {
  return Number.isInteger(item.width) && Number.isInteger(item.height) && item.width! > 0 && item.height! > 0
    ? `${item.width} × ${item.height}` : null;
}

export function getCollectionScene(collection: Pick<WallpaperCollection, 'item' | 'deviceCategory'>): 'phone' | 'fold' | 'pad' | 'desktop' | 'generic' {
  const categories = new Set(collection.item.map(item => item.category || collection.deviceCategory).filter(Boolean));
  if (categories.size !== 1) return 'generic';
  const category = Array.from(categories)[0];
  const scenes: Record<string, 'phone' | 'fold' | 'pad' | 'desktop'> = { phone: 'phone', phone_fold: 'fold', pad: 'pad', desktop: 'desktop' };
  return (category && scenes[category]) || 'generic';
}

// Keep model-specific editorial facts, but avoid repeating an old generated
// count/resolution introduction in front of the current live facts.
export function collectionEditorialDetail(language: Language, description?: string | null): string {
  const opening: Record<Language, RegExp> = {
    en: /^Download \d+ .+? wallpapers?(?:(?: as original| in)\b[^.]*| for free)\.\s*/,
    zh: /^(?:免费下载|下载|收录)\s*\d+\s*[张段].+?壁纸[^。]*。\s*/,
    ja: /^.+?の壁紙\d+枚を無料ダウンロード。\s*/,
    vi: /^Tải miễn phí \d+ hình nền[^.]*\.\s*/,
    'zh-hant': /^(?:免費下載|下載|精選)\s*\d+\s*[張段].+?(?:桌布|壁紙)[^。]*。\s*/,
  };
  const ending: Record<Language, RegExp> = {
    en: /\s*Preview each image before downloading for free\.$/,
    zh: /\s*可先逐张预览，再下载原图。$/,
    ja: /\s*プレビューから選んで保存できます。$/,
    vi: /\s*Xem trước từng ảnh rồi tải bản gốc\.$/,
    'zh-hant': /\s*可先逐張預覽，再下載原圖。$/,
  };
  return (description || '').trim().replace(opening[language], '').replace(ending[language], '').trim();
}

// One source for body copy, metadata and gallery schema. Never infer resolution from a cover.
export function buildCollectionIntro(language: Language, collection: Pick<WallpaperCollection,
  'name' | 'item' | 'description' | 'mediaType' | 'deviceCategory'>): string {
  const texts = getDiscoveryTexts(language);
  const sizes = new Map<string, number>();
  let known = 0;
  for (const item of collection.item) {
    const size = wallpaperResolution(item);
    if (size) { sizes.set(size, (sizes.get(size) || 0) + 1); known++; }
  }
  const sorted = Array.from(sizes).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const resolution = !known ? '' : fillDiscovery(
    known < collection.item.length ? texts.partial : sizes.size === 1 ? texts.exact : texts.multiple,
    { sizes: sorted.slice(0, 2).map(([size]) => size).join(' / ') }
  );
  const dynamic = collection.mediaType === 'dynamic' || collection.item.some(item => item.type.startsWith('video/'));
  const fact = fillDiscovery(dynamic ? texts.liveFact : texts.fact, {
    count: collection.item.length, name: collection.name, resolution,
  });
  const detail = collectionEditorialDetail(language, collection.description);
  const scene = dynamic ? texts.live : texts[getCollectionScene(collection)];
  return [fact, detail, detail?.includes(scene) ? '' : scene].filter(Boolean).join(' ');
}
