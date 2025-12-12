import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_TZ = "Asia/Tokyo";
export const DAY_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(v: string): boolean {
  return DAY_KEY_REGEX.test(v);
}

export function assertDayKey(v: string): void {
  if (!isDayKey(v)) throw new Error(`Invalid dayKey: ${v}`);
}

/**
 * Convert a Date/ISO string/dayKey into YYYY-MM-DD in the given timezone.
 * - If input is already a dayKey, it's treated as that day in tz (00:00).
 */
export function toDayKey(input: Date | string, tz: string = DEFAULT_TZ): string {
  if (typeof input === "string" && isDayKey(input)) {
    return dayjs.tz(input, tz).format("YYYY-MM-DD");
  }
  return dayjs(input).tz(tz).format("YYYY-MM-DD");
}

/** Start of day (00:00) ISO string in tz, returned as UTC ISO (Z). */
export function startOfDayUtcIso(dayKey: string, tz: string = DEFAULT_TZ): string {
  assertDayKey(dayKey);
  return dayjs.tz(dayKey, tz).startOf("day").utc().toISOString();
}

/** End of day (23:59:59.999) ISO string in tz, returned as UTC ISO (Z). */
export function endOfDayUtcIso(dayKey: string, tz: string = DEFAULT_TZ): string {
  assertDayKey(dayKey);
  return dayjs.tz(dayKey, tz).endOf("day").utc().toISOString();
}