import { imageDimensionsFromData } from 'image-dimensions';

export type OriginalDimensions = { width: number; height: number };
export type MediaByteSource = { size: number; read(start: number, length: number): Promise<Uint8Array> };
const MAX_METADATA_BYTES = 4 * 1024 * 1024;
const text = (bytes: Uint8Array, start: number, length: number) =>
  new TextDecoder().decode(bytes.subarray(start, start + length));
const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

function dimensions(width: number, height: number): OriginalDimensions {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw new Error('原文件分辨率无效');
  }
  return { width, height };
}

type Box = { type: string; start: number; end: number; payload: number };
function readBox(bytes: Uint8Array, start: number, fileEnd: number): Box {
  if (start + 8 > bytes.length) throw new Error('原视频元数据不完整');
  const data = view(bytes);
  let size = data.getUint32(start), headerSize = 8;
  if (size === 1) {
    if (start + 16 > bytes.length) throw new Error('原视频元数据不完整');
    size = Number(data.getBigUint64(start + 8)); headerSize = 16;
  } else if (size === 0) size = fileEnd - start;
  if (!Number.isSafeInteger(size) || size < headerSize || start + size > fileEnd) {
    throw new Error('原视频文件结构无效');
  }
  return { type: text(bytes, start + 4, 4), start, end: start + size, payload: start + headerSize };
}

function boxes(bytes: Uint8Array, start = 0, end = bytes.length): Box[] {
  const result: Box[] = [];
  for (let offset = start; offset < end;) {
    if (result.length > 4096) throw new Error('原视频元数据过大');
    const box = readBox(bytes, offset, end); result.push(box); offset = box.end;
  }
  return result;
}

function mp4TrackDimensions(bytes: Uint8Array): OriginalDimensions | null {
  for (const track of boxes(bytes).filter((box) => box.type === 'trak')) {
    const children = boxes(bytes, track.payload, track.end);
    const header = children.find((box) => box.type === 'tkhd');
    const media = children.find((box) => box.type === 'mdia');
    const handler = media && boxes(bytes, media.payload, media.end).find((box) => box.type === 'hdlr');
    if (!header || !handler || handler.end - handler.payload < 12 || text(bytes, handler.payload + 8, 4) !== 'vide') continue;
    const version = bytes[header.payload];
    if ((version !== 0 && version !== 1) || header.end - header.payload < (version === 1 ? 96 : 84)) continue;
    const data = view(bytes);
    let width = Math.round(data.getUint32(header.end - 8) / 65536);
    let height = Math.round(data.getUint32(header.end - 4) / 65536);
    const matrix = header.end - 44;
    if (data.getInt32(matrix) === 0 && data.getInt32(matrix + 16) === 0 &&
        Math.abs(data.getInt32(matrix + 4)) === 65536 && Math.abs(data.getInt32(matrix + 12)) === 65536) {
      [width, height] = [height, width];
    }
    if (width && height) return dimensions(width, height);
  }
  return null;
}

async function readMp4(source: MediaByteSource): Promise<OriginalDimensions> {
  for (let offset = 0, count = 0; offset < source.size && count < 256; count++) {
    const bytes = await source.read(offset, Math.min(16, source.size - offset));
    // Header offsets are relative to this small range, not to the whole video.
    const box = readBox(bytes, 0, source.size - offset);
    if (box.type === 'moov') {
      const length = box.end - box.payload;
      if (length > MAX_METADATA_BYTES) throw new Error('原视频元数据过大，无法读取分辨率');
      const payload = await source.read(offset + box.payload, length);
      const result = mp4TrackDimensions(payload);
      if (result) return result;
    }
    offset += box.end;
  }
  throw new Error('无法读取原视频分辨率，请检查原文件');
}

type EbmlElement = { id: number; payload: number; end: number };
function ebmlElements(bytes: Uint8Array, start: number, end: number): EbmlElement[] {
  const result: EbmlElement[] = [];
  for (let offset = start; offset < Math.min(end, bytes.length);) {
    const first = bytes[offset];
    let idLength = 1;
    while (idLength <= 4 && !(first & (1 << (8 - idLength)))) idLength++;
    if (idLength > 4 || offset + idLength >= bytes.length) break;
    let id = 0;
    for (let i = 0; i < idLength; i++) id = id * 256 + bytes[offset + i];
    offset += idLength;
    let sizeLength = 1;
    while (sizeLength <= 8 && !(bytes[offset] & (1 << (8 - sizeLength)))) sizeLength++;
    if (sizeLength > 8 || offset + sizeLength > bytes.length) break;
    const mask = (1 << (8 - sizeLength)) - 1;
    let size = bytes[offset] & mask;
    let unknownSize = size === mask;
    for (let i = 1; i < sizeLength; i++) {
      size = size * 256 + bytes[offset + i]; unknownSize &&= bytes[offset + i] === 255;
    }
    offset += sizeLength;
    const elementEnd = unknownSize ? end : offset + size;
    if (!Number.isSafeInteger(elementEnd) || elementEnd < offset || elementEnd > end) break;
    result.push({ id, payload: offset, end: elementEnd });
    if (result.length > 4096) throw new Error('原视频元数据过大');
    offset = elementEnd;
  }
  return result;
}

function webmDimensions(bytes: Uint8Array, fileSize: number): OriginalDimensions | null {
  const segment = ebmlElements(bytes, 0, fileSize).find((element) => element.id === 0x18538067);
  if (!segment) return null;
  const tracks = ebmlElements(bytes, segment.payload, segment.end).find((element) => element.id === 0x1654ae6b);
  if (!tracks) return null;
  const integer = (element: EbmlElement | undefined): number => {
    if (!element || element.end > bytes.length || element.end - element.payload > 6) return 0;
    let value = 0;
    for (let offset = element.payload; offset < element.end; offset++) value = value * 256 + bytes[offset];
    return value;
  };
  for (const entry of ebmlElements(bytes, tracks.payload, tracks.end).filter((element) => element.id === 0xae)) {
    const children = ebmlElements(bytes, entry.payload, entry.end);
    if (integer(children.find((element) => element.id === 0x83)) !== 1) continue;
    const video = children.find((element) => element.id === 0xe0);
    if (!video) continue;
    const fields = ebmlElements(bytes, video.payload, video.end);
    const width = integer(fields.find((element) => element.id === 0xb0));
    const height = integer(fields.find((element) => element.id === 0xba));
    if (width && height) return dimensions(width, height);
  }
  return null;
}

export async function readOriginalDimensions(source: MediaByteSource, mimeType: string): Promise<OriginalDimensions> {
  if (!Number.isSafeInteger(source.size) || source.size < 8) throw new Error('原文件为空或不完整');
  if (mimeType === 'video/mp4') return readMp4(source);
  const imageType = mimeType.match(/^image\/(png|jpeg|gif|webp|avif)$/)?.[1];
  if (!imageType && mimeType !== 'video/webm') throw new Error('不支持读取此原文件的分辨率');
  for (const limit of [64 * 1024, 512 * 1024, MAX_METADATA_BYTES]) {
    const bytes = await source.read(0, Math.min(source.size, limit));
    if (imageType) {
      const result = imageDimensionsFromData(bytes);
      if (result?.type === imageType) return dimensions(result.width, result.height);
    } else {
      const result = webmDimensions(bytes, source.size);
      if (result) return result;
    }
    if (bytes.length === source.size) break;
  }
  throw new Error('无法读取原文件分辨率，请检查原文件是否完整及格式是否正确');
}
