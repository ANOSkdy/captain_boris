import "server-only";

import { getDb } from "../client";
import { ensureSchema, newId } from "../schema";
import { DbRecord, DateRangeInput, normalizeDateRange, toDateOnly, toIsoString } from "../types";

export type DaysFields = {
  ownerKey: string;
  dayDate: string; // Date-only (YYYY-MM-DD)
  dayKey: string; // YYYY-MM-DD
  weightCount?: number;
  sleepCount?: number;
  mealCount?: number;
  workoutCount?: number;
  updatedAt?: string;
};

type DayRow = {
  id: string;
  owner_key: string;
  day_key: string;
  day_date: string | Date;
  created_at: string | Date;
  updated_at: string | Date;
  weight_count?: number | null;
  sleep_count?: number | null;
  meal_count?: number | null;
  workout_count?: number | null;
};

function mapDay(row: DayRow): DbRecord<DaysFields> {
  return {
    id: row.id,
    createdTime: toIsoString(row.created_at),
    fields: {
      ownerKey: row.owner_key,
      dayKey: row.day_key,
      dayDate: toDateOnly(row.day_date),
      weightCount: row.weight_count ?? 0,
      sleepCount: row.sleep_count ?? 0,
      mealCount: row.meal_count ?? 0,
      workoutCount: row.workout_count ?? 0,
      updatedAt: row.updated_at ? toIsoString(row.updated_at) : undefined,
    },
  };
}

async function findDayRow(ownerKey: string, dayKey: string): Promise<DayRow | null> {
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<DayRow[]>`SELECT * FROM days WHERE owner_key=${ownerKey} AND day_key=${dayKey} LIMIT 1;`;
  return rows[0] ?? null;
}

export async function findDayByOwnerAndKey(
  ownerKey: string,
  dayKey: string
): Promise<DbRecord<DaysFields> | null>;
export async function findDayByOwnerAndKey(input: {
  ownerKey: string;
  dayKey: string;
}): Promise<DbRecord<DaysFields> | null>;
export async function findDayByOwnerAndKey(
  ownerKeyOrInput: string | { ownerKey: string; dayKey: string },
  dayKey?: string
): Promise<DbRecord<DaysFields> | null> {
  const ownerKey = typeof ownerKeyOrInput === "string" ? ownerKeyOrInput : ownerKeyOrInput.ownerKey;
  const key = typeof ownerKeyOrInput === "string" ? dayKey! : ownerKeyOrInput.dayKey;
  const row = await findDayRow(ownerKey, key);
  return row ? mapDay(row) : null;
}

export async function createDay(input: {
  ownerKey: string;
  dayKey: string;
  dayDate: string; // YYYY-MM-DD
}): Promise<DbRecord<DaysFields>> {
  await ensureSchema();
  const sql = getDb();
  const id = newId();

  const rows = await sql<DayRow[]>`
    INSERT INTO days (id, owner_key, day_key, day_date)
    VALUES (${id}, ${input.ownerKey}, ${input.dayKey}, ${input.dayDate})
    ON CONFLICT (owner_key, day_key)
    DO UPDATE SET day_date = EXCLUDED.day_date, updated_at = now()
    RETURNING *;
  `;

  return mapDay(rows[0]);
}

export async function upsertDay(input: {
  ownerKey: string;
  dayKey: string;
  dayDate: string; // YYYY-MM-DD
}): Promise<{ dayId: string }> {
  const day = await createDay(input);
  return { dayId: day.id };
}

export async function listDaysByDateRange(
  ownerKey: string,
  startInclusive: string,
  endExclusive: string
): Promise<DbRecord<DaysFields>[]>;
export async function listDaysByDateRange(input: DateRangeInput): Promise<DbRecord<DaysFields>[]>;
export async function listDaysByDateRange(
  ownerKeyOrInput: string | DateRangeInput,
  startInclusive?: string,
  endExclusive?: string
): Promise<DbRecord<DaysFields>[]> {
  const range: { ownerKey: string; startInclusive: string; endExclusive: string } =
    typeof ownerKeyOrInput === "string"
      ? { ownerKey: ownerKeyOrInput, startInclusive: startInclusive!, endExclusive: endExclusive! }
      : normalizeDateRange(ownerKeyOrInput);

  await ensureSchema();
  const sql = getDb();

  const rows = await sql<DayRow[]>`
    SELECT d.*, COALESCE(w.weight_count, 0) AS weight_count, COALESCE(s.sleep_count, 0) AS sleep_count,
      COALESCE(m.meal_count, 0) AS meal_count, COALESCE(o.workout_count, 0) AS workout_count
    FROM days d
    LEFT JOIN (
      SELECT owner_key, day_key, COUNT(*)::int AS weight_count
      FROM weight_logs
      WHERE owner_key=${range.ownerKey} AND day_key >= ${range.startInclusive} AND day_key < ${range.endExclusive}
      GROUP BY owner_key, day_key
    ) w ON w.owner_key = d.owner_key AND w.day_key = d.day_key
    LEFT JOIN (
      SELECT owner_key, day_key, COUNT(*)::int AS sleep_count
      FROM sleep_logs
      WHERE owner_key=${range.ownerKey} AND day_key >= ${range.startInclusive} AND day_key < ${range.endExclusive}
      GROUP BY owner_key, day_key
    ) s ON s.owner_key = d.owner_key AND s.day_key = d.day_key
    LEFT JOIN (
      SELECT owner_key, day_key, COUNT(*)::int AS meal_count
      FROM meal_logs
      WHERE owner_key=${range.ownerKey} AND day_key >= ${range.startInclusive} AND day_key < ${range.endExclusive}
      GROUP BY owner_key, day_key
    ) m ON m.owner_key = d.owner_key AND m.day_key = d.day_key
    LEFT JOIN (
      SELECT owner_key, day_key, COUNT(*)::int AS workout_count
      FROM workout_logs
      WHERE owner_key=${range.ownerKey} AND day_key >= ${range.startInclusive} AND day_key < ${range.endExclusive}
      GROUP BY owner_key, day_key
    ) o ON o.owner_key = d.owner_key AND o.day_key = d.day_key
    WHERE d.owner_key=${range.ownerKey}
      AND d.day_key >= ${range.startInclusive}
      AND d.day_key < ${range.endExclusive}
    ORDER BY d.day_date ASC;
  `;

  return rows.map(mapDay);
}
