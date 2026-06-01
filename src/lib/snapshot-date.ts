export const SNAPSHOT_TIMEZONE = "Asia/Shanghai";

export function getSnapshotDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SNAPSHOT_TIMEZONE }).format(date);
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return getSnapshotDateKey(anchor);
}

export function isPostedOnDateKey(postedAt: string | null | undefined, dateKey: string) {
  if (!postedAt) return false;
  const date = new Date(postedAt);
  if (Number.isNaN(date.getTime())) return false;
  return getSnapshotDateKey(date) === dateKey;
}
