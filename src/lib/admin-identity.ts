export function normalizeAdminDisplay(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

export function normalizeAdminName(value: string): string {
  return normalizeAdminDisplay(value).toLowerCase();
}

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/i.test(error.message);
}
