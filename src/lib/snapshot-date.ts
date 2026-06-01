import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { BEIJING_TIMEZONE, getBeijingDateKey } from "@/lib/format-beijing-time";

dayjs.extend(utc);
dayjs.extend(timezone);

export const SNAPSHOT_TIMEZONE = BEIJING_TIMEZONE;

export { getBeijingDateKey as getSnapshotDateKey };

export function addDaysToDateKey(dateKey: string, days: number) {
  return dayjs.tz(`${dateKey} 12:00:00`, BEIJING_TIMEZONE).add(days, "day").format("YYYY-MM-DD");
}

export function isPostedOnDateKey(postedAt: string | null | undefined, dateKey: string) {
  if (!postedAt) return false;
  return getBeijingDateKey(postedAt) === dateKey;
}
