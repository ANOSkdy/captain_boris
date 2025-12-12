import dayjs from "dayjs";

/**
 * Duration in minutes from start -> end.
 * - Returns a clamped integer (min 0).
 * - Caps extremely large durations to avoid accidental explosions.
 */
export function calcDurationMin(startIso: string, endIso: string): number {
  const start = dayjs(startIso);
  const end = dayjs(endIso);

  if (!start.isValid() || !end.isValid()) {
    throw new Error(`Invalid datetime: start=${startIso} end=${endIso}`);
  }

  const diff = end.diff(start, "minute");
  const safe = Math.max(0, diff);

  // cap at 7 days just in case (sleep/workout should never exceed this)
  return Math.min(safe, 7 * 24 * 60);
}

export function clampInt(n: number, min: number, max: number): number {
  const x = Number.isFinite(n) ? Math.trunc(n) : min;
  return Math.max(min, Math.min(max, x));
}