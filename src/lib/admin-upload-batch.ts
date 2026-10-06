export async function uploadAdminBatch<Row>(
  rows: readonly Row[],
  upload: (row: Row) => Promise<boolean>,
  onComplete: (count: number) => void,
): Promise<void> {
  let succeeded = 0;
  for (const row of rows) {
    if (await upload(row)) succeeded++;
  }
  if (rows.length > 0 && succeeded === rows.length) onComplete(succeeded);
}
