import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outputDir = path.resolve(import.meta.dirname, '../public/hero');
const sourceFile = path.resolve(import.meta.dirname, '../public/social/phwalls-square-v4.jpg');
const canvasWidth = 1536;
const height = 480;
// The social artwork contains three 352x650 wallpaper crops starting at y=360.
const panels = [
  {
    left: 0,
    sourceLeft: 48,
    width: 640,
  },
  {
    left: 640,
    sourceLeft: 424,
    width: 448,
  },
  {
    left: 1088,
    sourceLeft: 800,
    width: 448,
  },
];

const layers = await Promise.all(panels.map(async ({ left, sourceLeft, width }) => {
  return {
    input: await sharp(sourceFile)
      .extract({ left: sourceLeft, top: 360, width: 352, height: 650 })
      .resize(width, height, { fit: 'cover' })
      .toBuffer(),
    left,
    top: 0,
  };
}));

const scrim = Buffer.from(`<svg width="${canvasWidth}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="shade" x1="0" x2="1">
    <stop offset="0" stop-color="#071719" stop-opacity="0.80"/>
    <stop offset="0.44" stop-color="#071719" stop-opacity="0.66"/>
    <stop offset="0.75" stop-color="#071719" stop-opacity="0.18"/>
    <stop offset="1" stop-color="#071719" stop-opacity="0.04"/>
  </linearGradient></defs>
  <rect width="${canvasWidth}" height="${height}" fill="url(#shade)"/>
</svg>`);

await fs.mkdir(outputDir, { recursive: true });
await sharp({ create: { width: canvasWidth, height, channels: 3, background: '#0b1519' } })
  .composite([...layers, { input: scrim }])
  .webp({ quality: 86, effort: 6 })
  .toFile(path.join(outputDir, 'phwalls-home-hero-v1.webp'));

console.log('Generated public/hero/phwalls-home-hero-v1.webp');
