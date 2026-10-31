export function publishedSermonRows<T extends { status?: unknown }>(rows: T[]): T[] {
  return rows.filter((row) => row.status === 'PUBLISHED');
}
