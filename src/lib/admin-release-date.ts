export function normalizeAdminReleaseDate(value: unknown, allowEmpty = false): string {
  if (allowEmpty && value === null) return '';
  if (typeof value !== 'string') throw new Error('发布日期无效');
  const text = value.normalize('NFKC').trim();
  if (!text && allowEmpty) return '';
  const parts = text.match(/^(\d{4})\s*年\s*(?:(\d{1,2})\s*月\s*(?:(\d{1,2})\s*日)?)?$/)
    || text.match(/^(\d{4})(?:[-/](\d{1,2})(?:[-/](\d{1,2}))?)?$/);
  if (!parts) throw new Error('发布日期请填写 YYYY/MM/DD 或 2021年9月22日，也支持年份或年月');
  const year = Number(parts[1]);
  const month = parts[2] === undefined ? undefined : Number(parts[2]);
  const day = parts[3] === undefined ? undefined : Number(parts[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (!year || (month !== undefined && (month < 1 || month > 12)) ||
      (day !== undefined && (day < 1 || day > days[month! - 1]))) throw new Error('发布日期不是有效日期');
  return [parts[1], ...(month === undefined ? [] : [String(month).padStart(2, '0')]),
    ...(day === undefined ? [] : [String(day).padStart(2, '0')])].join('/');
}
