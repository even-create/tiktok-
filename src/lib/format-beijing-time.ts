import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/** All analytics date boundaries and display formatting use Beijing time (UTC+8). */
export const BEIJING_TIMEZONE = "Asia/Shanghai";

export type BeijingTimeFormat = "full" | "compact" | "chinese" | "chinese-date" | "chart-day" | "seconds";

type TimeInput = string | number | Date | null | undefined;

const HAS_TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const ISO_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

function parseBeijingDayjs(time: TimeInput) {
  if (time === null || time === undefined || time === "") return null;

  if (typeof time === "number") {
    const milliseconds = time < 1e12 ? time * 1000 : time;
    const parsed = dayjs.utc(milliseconds);
    return parsed.isValid() ? parsed : null;
  }

  if (time instanceof Date) {
    const parsed = dayjs.utc(time.getTime());
    return parsed.isValid() ? parsed : null;
  }

  const trimmed = time.trim();
  if (!trimmed) return null;

  if (HAS_TIMEZONE_SUFFIX.test(trimmed)) {
    const parsed = dayjs(trimmed);
    return parsed.isValid() ? parsed : null;
  }

  // Supabase timestamptz / TikTok ISO often omit Z — treat as UTC, then show in Beijing.
  if (ISO_LOCAL_PATTERN.test(trimmed)) {
    const normalized = trimmed.replace(" ", "T");
    const parsed = dayjs.utc(normalized);
    return parsed.isValid() ? parsed : null;
  }

  const parsed = dayjs(trimmed);
  return parsed.isValid() ? parsed : null;
}

function formatPattern(time: TimeInput, pattern: string, fallback = "—") {
  const parsed = parseBeijingDayjs(time);
  if (!parsed) return fallback;
  return parsed.tz(BEIJING_TIMEZONE).format(pattern);
}

/** YYYY-MM-DD HH:mm */
export function formatBeijingTime(time: TimeInput, fallback = "—") {
  return formatPattern(time, "YYYY-MM-DD HH:mm", fallback);
}

/** MM-DD HH:mm */
export function formatBeijingTimeCompact(time: TimeInput, fallback = "—") {
  return formatPattern(time, "MM-DD HH:mm", fallback);
}

/** 6月1日 09:06 */
export function formatBeijingTimeChinese(time: TimeInput, fallback = "—") {
  return formatPattern(time, "M月D日 HH:mm", fallback);
}

/** 6月1日 */
export function formatBeijingDateChinese(time: TimeInput, fallback = "—") {
  return formatPattern(time, "M月D日", fallback);
}

/** YYYY-MM-DD HH:mm:ss */
export function formatBeijingTimeSeconds(time: TimeInput, fallback = "—") {
  return formatPattern(time, "YYYY-MM-DD HH:mm:ss", fallback);
}

/** M/D — chart axis labels */
export function formatBeijingChartDay(time: TimeInput, fallback = "—") {
  return formatPattern(time, "M/D", fallback);
}

/** YYYY-MM-DD — date keys for snapshots */
export function getBeijingDateKey(time: TimeInput = new Date()) {
  return formatPattern(time, "YYYY-MM-DD", "");
}

/** Absolute instant (ms) for comparisons and sorting. */
export function getBeijingTimestamp(time: TimeInput): number | null {
  const parsed = parseBeijingDayjs(time);
  return parsed?.valueOf() ?? null;
}

/** Start of today 00:00 in Beijing. */
export function getBeijingTodayStartMs() {
  return dayjs().tz(BEIJING_TIMEZONE).startOf("day").valueOf();
}

/** Inclusive calendar window: last N Beijing days including today. */
export function getBeijingCalendarRangeStartMs(dayCount: number) {
  if (dayCount <= 1) return getBeijingTodayStartMs();
  return dayjs()
    .tz(BEIJING_TIMEZONE)
    .subtract(dayCount - 1, "day")
    .startOf("day")
    .valueOf();
}

export function isWithinBeijingCalendarDays(time: TimeInput, dayCount: number) {
  const timestamp = getBeijingTimestamp(time);
  if (timestamp === null) return false;
  return timestamp >= getBeijingCalendarRangeStartMs(dayCount);
}

export function getBeijingHour(time: TimeInput): number | null {
  const parsed = parseBeijingDayjs(time);
  if (!parsed) return null;
  return parsed.tz(BEIJING_TIMEZONE).hour();
}

/** Monday 00:00 Beijing for the week containing `time`. */
export function getBeijingWeekStartMs(time: TimeInput): number | null {
  const parsed = parseBeijingDayjs(time);
  if (!parsed) return null;
  const beijing = parsed.tz(BEIJING_TIMEZONE);
  const weekday = beijing.day();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  return beijing.subtract(daysSinceMonday, "day").startOf("day").valueOf();
}

export function getBeijingRangeMidpointMs(dayCount: number) {
  const start = getBeijingCalendarRangeStartMs(dayCount);
  const end = dayjs().tz(BEIJING_TIMEZONE).endOf("day").valueOf();
  return start + (end - start) / 2;
}

export type BeijingDayBucket = {
  key: string;
  label: string;
  start: number;
  end: number;
};

/** Calendar-aligned day buckets in Beijing time for charts and trends. */
export function buildBeijingDayBuckets(rangeDays: number, stepDays = 1): BeijingDayBucket[] {
  const bucketCount = stepDays > 1 ? Math.ceil(rangeDays / stepDays) : rangeDays;
  const today = dayjs().tz(BEIJING_TIMEZONE).startOf("day");
  const buckets: BeijingDayBucket[] = [];

  for (let index = 0; index < bucketCount; index += 1) {
    const endDayOffset = (bucketCount - 1 - index) * stepDays;
    const bucketEndDay = today.subtract(endDayOffset, "day");
    const bucketStartDay = bucketEndDay.subtract(stepDays - 1, "day").startOf("day");
    const start = bucketStartDay.valueOf();
    const end = bucketEndDay.endOf("day").valueOf() + 1;

    buckets.push({
      key: `${start}-${end}`,
      label: formatBeijingChartDay(bucketEndDay.valueOf()),
      start,
      end,
    });
  }

  return buckets;
}

export function formatBeijingTimeByVariant(
  time: TimeInput,
  variant: BeijingTimeFormat = "full",
  fallback = "—",
) {
  switch (variant) {
    case "compact":
      return formatBeijingTimeCompact(time, fallback);
    case "chinese":
      return formatBeijingTimeChinese(time, fallback);
    case "chinese-date":
      return formatBeijingDateChinese(time, fallback);
    case "chart-day":
      return formatBeijingChartDay(time, fallback);
    case "seconds":
      return formatBeijingTimeSeconds(time, fallback);
    case "full":
    default:
      return formatBeijingTime(time, fallback);
  }
}
