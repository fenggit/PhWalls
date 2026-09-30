type DatedCollection = {
  name: string;
  date: string;
  item?: Array<{ compressPath?: string; originPath?: string }>;
};

export function selectRecentCollections<T extends DatedCollection>(
  collectionsByCategory: Record<string, T[]>,
  categorySlugs: string[],
  limit: number,
  now: Date,
  maxPerCategory = 2
): Array<{ category: string; collection: T }> {
  if (limit <= 0) return [];
  const cutoff = now.getTime();
  const candidates = categorySlugs.flatMap((category) =>
    (collectionsByCategory[category] || []).flatMap((collection) => {
      const cover = collection.item?.[0];
      const date = collection.date?.replace(/\//g, '-');
      const timestamp = date ? Date.parse(date) : NaN;
      return cover && (cover.compressPath || cover.originPath) && Number.isFinite(timestamp) && timestamp <= cutoff
        ? [{ category, collection, timestamp }]
        : [];
    })
  );

  candidates.sort((left, right) => right.timestamp - left.timestamp);
  const perCategory = new Map<string, number>();
  const result: Array<{ category: string; collection: T }> = [];

  for (const candidate of candidates) {
    const count = perCategory.get(candidate.category) || 0;
    if (count >= maxPerCategory) continue;
    result.push({ category: candidate.category, collection: candidate.collection });
    perCategory.set(candidate.category, count + 1);
    if (result.length >= limit) break;
  }

  return result;
}
