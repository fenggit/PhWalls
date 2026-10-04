type CollectionSeoFields = {
  seoTitle?: string | null;
  description?: string | null;
};

type CollectionSeoCopy = {
  title: string;
  description: string;
  summaryTitle: string;
  summaryDescription: string;
  galleryName: string;
  galleryDescription: string;
};

export function applyCollectionSeo<T extends CollectionSeoCopy>(copy: T, fields: CollectionSeoFields): T {
  return {
    ...copy,
    ...(fields.seoTitle ? {
      title: `${fields.seoTitle} | PhWalls`,
      summaryTitle: fields.seoTitle,
      galleryName: fields.seoTitle,
    } : {}),
    ...(fields.description ? {
      description: fields.description,
      summaryDescription: fields.description,
      galleryDescription: fields.description,
    } : {}),
  };
}
