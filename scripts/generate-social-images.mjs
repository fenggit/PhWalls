import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(projectRoot, 'public/social');
const wallpaperKeys = [
  'google pixel/Google Pixel 8 Pro/compress/google-pixel-8-pro-jade-light.webp',
  'nothing/Nothing Phone 4a/compress/nothing-phone-4a-orange-mirrored-capsule.webp',
  'desktopwalls/Microsoft Windows/Windows 11/compress/windows-11-black-blue-abstract.webp',
];

async function fetchWallpaper(key) {
  const url = new URL(key.split('/').map(encodeURIComponent).join('/'), 'https://static.phwalls.com/');
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Failed to fetch ${key}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function generateSocialImage(filename, height, wallpapers) {
  // Match AppleWalls' spacing and typography, including its square upload variant.
  const square = height === 1200;
  const top = square ? 360 : 205;
  const photoHeight = square ? 650 : height - top - 46;
  const panels = await Promise.all(wallpapers.map(async (input, index) => ({
    input: await sharp(input).resize(352, photoHeight, { fit: 'cover' }).png().toBuffer(),
    left: 48 + index * 376,
    top,
  })));
  const wordmark = Buffer.from(`<svg width="1200" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="48" y="${square ? 166 : 103}" fill="#151719" font-family="Helvetica, Arial, sans-serif" font-size="76" font-weight="700">PhWalls</text>
    <text x="51" y="${square ? 238 : 155}" fill="#555b61" font-family="Helvetica, Arial, sans-serif" font-size="25">Samsung / Xiaomi / Huawei / OPPO / vivo / Google Pixel / Nothing / Desktop</text>
    <text x="${square ? 48 : 1152}" y="${square ? 1110 : 99}" text-anchor="${square ? 'start' : 'end'}" fill="#555b61" font-family="Helvetica, Arial, sans-serif" font-size="24">phwalls.com</text>
  </svg>`);
  await sharp({ create: { width: 1200, height, channels: 3, background: '#f5f6f7' } })
    .composite([...panels, { input: wordmark }])
    .jpeg({ quality: 93, chromaSubsampling: '4:4:4', progressive: true })
    .toFile(path.join(outputDir, filename));
}

await fs.mkdir(outputDir, { recursive: true });
const wallpapers = await Promise.all(wallpaperKeys.map(fetchWallpaper));
await generateSocialImage('phwalls-open-graph-v4.jpg', 630, wallpapers);
await generateSocialImage('phwalls-x-v4.jpg', 600, wallpapers);
await generateSocialImage('phwalls-square-v4.jpg', 1200, wallpapers);
console.log('Generated v4 social artwork: Open Graph 1200x630, X 1200x600, square 1200x1200.');
