import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createTsLoader } from '../scripts/tests/load-ts.mjs';

const load = createTsLoader();
const metadata = () => load('src/lib/original-media-metadata.ts');
const source = (bytes, reads = []) => ({ size: bytes.length, async read(start, length) {
  reads.push({ start, length }); return new Uint8Array(bytes.subarray(start, start + length));
} });
const box = (type, ...parts) => {
  const body = Buffer.concat(parts), header = Buffer.alloc(8);
  header.writeUInt32BE(body.length + 8); header.write(type, 4); return Buffer.concat([header, body]);
};
function track(width, height, handler = 'vide', rotated = false) {
  const tkhd = Buffer.alloc(84);
  tkhd.writeInt32BE(rotated ? 0 : 65536, 40);
  tkhd.writeInt32BE(rotated ? 65536 : 0, 44);
  tkhd.writeInt32BE(rotated ? -65536 : 0, 52);
  tkhd.writeInt32BE(rotated ? 0 : 65536, 56);
  tkhd.writeUInt32BE(width * 65536, 76); tkhd.writeUInt32BE(height * 65536, 80);
  const hdlr = Buffer.alloc(24); hdlr.write(handler, 8);
  return box('trak', box('tkhd', tkhd), box('mdia', box('hdlr', hdlr)));
}

for (const format of ['png', 'jpeg', 'webp', 'avif', 'gif']) {
  test(`reads original ${format} dimensions from real image headers`, async () => {
    const data = readFileSync(new URL(`./fixtures/original-media/sample.${format}`, import.meta.url));
    assert.deepEqual(await metadata().readOriginalDimensions(source(data), `image/${format}`), { width: 17, height: 31 });
  });
}

test('MP4 reads a video track after audio and skips a large mdat before the tail moov', async () => {
  const media = box('mdat', Buffer.alloc(5 * 1024 * 1024));
  const bytes = Buffer.concat([box('ftyp', Buffer.from('isom0000')), media, box('moov', track(0, 0, 'soun'), track(1920, 1080))]);
  const reads = [];
  assert.deepEqual(await metadata().readOriginalDimensions(source(bytes, reads), 'video/mp4'), { width: 1920, height: 1080 });
  assert.ok(reads.reduce((sum, read) => sum + read.length, 0) < 1024, 'metadata must not fetch the video payload');
});

test('MP4 accounts for a portrait video track rotation', async () => {
  const bytes = box('moov', track(1920, 1080, 'vide', true));
  assert.deepEqual(await metadata().readOriginalDimensions(source(bytes), 'video/mp4'), { width: 1080, height: 1920 });
});

test('MP4 supports extended-size boxes and rejects truncated metadata', async () => {
  const header = Buffer.alloc(16); header.writeUInt32BE(1); header.write('free', 4); header.writeBigUInt64BE(16n, 8);
  const bytes = Buffer.concat([header, box('moov', track(1440, 3200))]);
  assert.deepEqual(await metadata().readOriginalDimensions(source(bytes), 'video/mp4'), { width: 1440, height: 3200 });
  await assert.rejects(() => metadata().readOriginalDimensions(source(bytes.subarray(0, bytes.length - 20)), 'video/mp4'));
});

test('WebM extracts original pixel dimensions from the video track', async () => {
  const element = (id, bytes) => Buffer.concat([Buffer.from(id), Buffer.from([0x80 | bytes.length]), bytes]);
  const video = element([0xe0], Buffer.concat([element([0xb0], Buffer.from([0x04, 0x38])), element([0xba], Buffer.from([0x09, 0x60]))]));
  const entry = element([0xae], Buffer.concat([element([0x83], Buffer.from([1])), video]));
  const tracks = element([0x16, 0x54, 0xae, 0x6b], entry);
  const segment = element([0x18, 0x53, 0x80, 0x67], tracks);
  assert.deepEqual(await metadata().readOriginalDimensions(source(segment), 'video/webm'), { width: 1080, height: 2400 });
});

test('invalid files never produce guessed dimensions', async () => {
  await assert.rejects(() => metadata().readOriginalDimensions(source(Buffer.from('not an image')), 'image/png'));
  await assert.rejects(() => metadata().readOriginalDimensions(source(box('moov', track(0, 0, 'soun'))), 'video/mp4'));
  await assert.rejects(() => metadata().readOriginalDimensions(source(Buffer.from('fake')), 'video/unknown'));
});
