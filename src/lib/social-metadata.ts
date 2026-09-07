import { SITE_URL } from '@/lib/seo';

export const OPEN_GRAPH_IMAGE_URL = `${SITE_URL}/social/phwalls-open-graph-v4.jpg`;
export const X_IMAGE_URL = `${SITE_URL}/social/phwalls-x-v4.jpg`;

export const DEFAULT_OPEN_GRAPH_IMAGES = [
  {
    url: OPEN_GRAPH_IMAGE_URL,
    width: 1200,
    height: 630,
    type: 'image/jpeg',
    alt: 'PhWalls official phone and desktop wallpaper collection',
  },
] satisfies Array<{
  url: string;
  width: number;
  height: number;
  type: string;
  alt: string;
}>;

export const DEFAULT_X_IMAGES = [
  {
    url: X_IMAGE_URL,
    width: 1200,
    height: 600,
    alt: 'PhWalls official phone and desktop wallpaper collection',
  },
] satisfies Array<{
  url: string;
  width: number;
  height: number;
  alt: string;
}>;
