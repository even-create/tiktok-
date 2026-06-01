import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const BEIJING_TIMEZONE = "Asia/Shanghai";

export type BeijingTimeFormat = "full" | "compact" | "chinese" | "chinese-date" | "chart-day" | "seconds";

type TimeInput = string | number | Date | null | undefined;

function parseBeijingDayjs(time: TimeInput) {
  if (time === null || time === undefined || time === "") return null;

  if (typeof time === "number") {
    const milliseconds = time < 1e12 ? time * 1000 : time;
    const parsed = dayjs(milliseconds);
    return parsed.isValid() ? parsed : null;
  }

  const parsed = dayjs(time);
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
