import "server-only";

import { getDb } from "../client";
import { ensureSchema, newId } from "../schema";
import { DbRecord, normalizeOwnerDayArgs, toIsoString } from "../types";

export type SleepFields = {
  ownerKey: string;
  dayRef: string[]; // Link to Days (wake-up day)
  dayKey: string; // wake-up YYYY-MM-DD
  sleepStartAt: string; // ISO
  sleepEndAt: string; // ISO
  durationMin: number;
  quality?: string; // Single select
  note?: string;
};

type SleepRow = {
  id: string;
  owner_key: string;
  day_id: string;
  day_key: string;
  sleep_start_at: string | Date;
  sleep_end_at: string | Date;
  duration_min: number;
  quality: string | null;
  note: string | null;
  created_at: string | Date;
};

function mapSleep(row: SleepRow): DbRecord<SleepFields> {
  return {
    id: row.id,
    createdTime: toIsoString(row.created_at),
    fields: {
      ownerKey: row.owner_key,
      dayRef: row.day_id ? [row.day_id] : [],
      dayKey: row.day_key,
      sleepStartAt: toIsoString(row.sleep_start_at),
      sleepEndAt: toIsoString(row.sleep_end_at),
      durationMin: row.duration_min,
      quality: row.quality ?? undefined,
      note: row.note ?? undefined,
    },
  };
}

async function findSleepRowById(id: string): Promise<SleepRow | null> {
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<SleepRow[]>`SELECT * FROM sleep_logs WHERE id=${id} LIMIT 1;`;
  return rows[0] ?? null;
}

export async function findSleepByOwnerAndDayKey(
  ownerKey: string,
  dayKey: string
): Promise<DbRecord<SleepFields> | null>;
export async function findSleepByOwnerAndDayKey(input: {
  ownerKey: string;
  dayKey: string;
}): Promise<DbRecord<SleepFields> | null>;
export async function findSleepByOwnerAndDayKey(
  ownerKeyOrInput: string | { ownerKey: string; dayKey: string },
  dayKey?: string
): Promise<DbRecord<SleepFields> | null> {
  const { ownerKey, dayKey: key } = normalizeOwnerDayArgs(ownerKeyOrInput as any, dayKey as any);
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<SleepRow[]>`SELECT * FROM sleep_logs WHERE owner_key=${ownerKey} AND day_key=${key} LIMIT 1;`;
  return rows[0] ? mapSleep(rows[0]) : null;
}

export async function createSleep(input: {
  ownerKey: string;
  dayId: string;
  dayKey: string;
  sleepStartAt: string;
  sleepEndAt: string;
  durationMin: number;
  quality?: string;
  note?: string;
}): Promise<DbRecord<SleepFields>> {
  await ensureSchema();
  const sql = getDb();
  const id = newId();

  const rows = await sql<SleepRow[]>`
    INSERT INTO sleep_logs (id, owner_key, day_id, day_key, sleep_start_at, sleep_end_at, duration_min, quality, note)
    VALUES (${id}, ${input.ownerKey}, ${input.dayId}, ${input.dayKey}, ${input.sleepStartAt}, ${input.sleepEndAt}, ${input.durationMin}, ${input.quality ?? null}, ${input.note ?? null})
    RETURNING *;
  `;

  return mapSleep(rows[0]);
}

export async function updateSleepById(
  id: string,
  fields: Partial<SleepFields>
): Promise<DbRecord<SleepFields>> {
  const existing = await findSleepRowById(id);
  if (!existing) throw new Error(`Sleep not found: ${id}`);

  const next = {
    owner_key: fields.ownerKey ?? existing.owner_key,
    day_id: fields.dayRef?.[0] ?? existing.day_id,
    day_key: fields.dayKey ?? existing.day_key,
    sleep_start_at: fields.sleepStartAt ?? existing.sleep_start_at,
    sleep_end_at: fields.sleepEndAt ?? existing.sleep_end_at,
    duration_min: fields.durationMin ?? existing.duration_min,
    quality: fields.quality ?? existing.quality,
    note: fields.note ?? existing.note,
  };

  await ensureSchema();
  const sql = getDb();
  const rows = await sql<SleepRow[]>`
    UPDATE sleep_logs
    SET owner_key=${next.owner_key}, day_id=${next.day_id}, day_key=${next.day_key}, sleep_start_at=${next.sleep_start_at},
      sleep_end_at=${next.sleep_end_at}, duration_min=${next.duration_min}, quality=${next.quality}, note=${next.note}
    WHERE id=${id}
    RETURNING *;
  `;

  return mapSleep(rows[0]);
}

export async function deleteSleepByDayKey(input: { ownerKey: string; dayKey: string }): Promise<void>;
export async function deleteSleepByDayKey(ownerKey: string, dayKey: string): Promise<void>;
export async function deleteSleepByDayKey(
  ownerKeyOrInput: string | { ownerKey: string; dayKey: string },
  dayKey?: string
): Promise<void> {
  const { ownerKey, dayKey: key } = normalizeOwnerDayArgs(ownerKeyOrInput as any, dayKey as any);
  await ensureSchema();
  const sql = getDb();
  await sql`DELETE FROM sleep_logs WHERE owner_key=${ownerKey} AND day_key=${key};`;
}
