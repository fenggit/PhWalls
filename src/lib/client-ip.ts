// Only accept literal addresses; callers decide which header is trusted.
export function normalizeClientIp(value: unknown): string | null {
  if (typeof value !== 'string' || !value || value.length > 45) return null;
  if (/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value)) {
    return value.split('.').every((part) => Number(part) <= 255) ? value : null;
  }
  if (!value.includes(':') || !/^[0-9a-f:.]+$/i.test(value)) return null;
  try {
    const ip = new URL(`http://[${value}]/`).hostname.slice(1, -1);
    const mapped = ip.match(/^::ffff:([0-9a-f]+):([0-9a-f]+)$/);
    if (mapped) {
      const high = parseInt(mapped[1], 16), low = parseInt(mapped[2], 16);
      return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
    }
    return ip;
  } catch { return null; }
}
