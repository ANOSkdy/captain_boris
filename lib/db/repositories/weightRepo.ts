import "server-only";

import { getDb } from "../client";
import { ensureSchema, newId } from "../schema";
import { DbRecord, normalizeOwnerDayArgs, toIsoString } from "../types";

export type WeightFields = {
  ownerKey: string;
  dayRef: string[]; // Link to Days (record ids)
  dayKey: string;
  recordedAt: string; // ISO datetime
  weightKg: number;
  bodyFatPct?: number;
  note?: string;
};

type WeightRow = {
  id: string;
  owner_key: string;
  day_id: string;
  day_key: string;
  recorded_at: string | Date;
  weight_kg: number;
  body_fat_pct: number | null;
  note: string | null;
  created_at: string | Date;
};

function mapWeight(row: WeightRow): DbRecord<WeightFields> {
  return {
    id: row.id,
    createdTime: toIsoString(row.created_at),
    fields: {
      ownerKey: row.owner_key,
      dayRef: row.day_id ? [row.day_id] : [],
      dayKey: row.day_key,
      recordedAt: toIsoString(row.recorded_at),
      weightKg: row.weight_kg,
      bodyFatPct: row.body_fat_pct ?? undefined,
      note: row.note ?? undefined,
    },
  };
}

async function findWeightRowById(id: string): Promise<WeightRow | null> {
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<WeightRow[]>`SELECT * FROM weight_logs WHERE id=${id} LIMIT 1;`;
  return rows[0] ?? null;
}

export async function findWeightByOwnerAndDayKey(
  ownerKey: string,
  dayKey: string
): Promise<DbRecord<WeightFields> | null>;
export async function findWeightByOwnerAndDayKey(input: {
  ownerKey: string;
  dayKey: string;
}): Promise<DbRecord<WeightFields> | null>;
export async function findWeightByOwnerAndDayKey(
  ownerKeyOrInput: string | { ownerKey: string; dayKey: string },
  dayKey?: string
): Promise<DbRecord<WeightFields> | null> {
  const { ownerKey, dayKey: dayKeyNorm } = normalizeOwnerDayArgs(ownerKeyOrInput as any, dayKey as any);
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<WeightRow[]>`SELECT * FROM weight_logs WHERE owner_key=${ownerKey} AND day_key=${dayKeyNorm} LIMIT 1;`;
  return rows[0] ? mapWeight(rows[0]) : null;
}

export async function createWeight(input: {
  ownerKey: string;
  dayId: string;
  dayKey: string;
  recordedAt: string; // ISO
  weightKg: number;
  bodyFatPct?: number;
  note?: string;
}): Promise<DbRecord<WeightFields>> {
  await ensureSchema();
  const sql = getDb();
  const id = newId();

  const rows = await sql<WeightRow[]>`
    INSERT INTO weight_logs (id, owner_key, day_id, day_key, recorded_at, weight_kg, body_fat_pct, note)
    VALUES (${id}, ${input.ownerKey}, ${input.dayId}, ${input.dayKey}, ${input.recordedAt}, ${input.weightKg}, ${input.bodyFatPct ?? null}, ${input.note ?? null})
    RETURNING *;
  `;

  return mapWeight(rows[0]);
}

export async function updateWeightById(
  id: string,
  fields: Partial<WeightFields>
): Promise<DbRecord<WeightFields>> {
  const existing = await findWeightRowById(id);
  if (!existing) throw new Error(`Weight not found: ${id}`);

  const next = {
    owner_key: fields.ownerKey ?? existing.owner_key,
    day_id: fields.dayRef?.[0] ?? existing.day_id,
    day_key: fields.dayKey ?? existing.day_key,
    recorded_at: fields.recordedAt ?? existing.recorded_at,
    weight_kg: fields.weightKg ?? existing.weight_kg,
    body_fat_pct: fields.bodyFatPct ?? existing.body_fat_pct,
    note: fields.note ?? existing.note,
  };

  await ensureSchema();
  const sql = getDb();
  const rows = await sql<WeightRow[]>`
    UPDATE weight_logs
    SET owner_key=${next.owner_key}, day_id=${next.day_id}, day_key=${next.day_key}, recorded_at=${next.recorded_at},
      weight_kg=${next.weight_kg}, body_fat_pct=${next.body_fat_pct}, note=${next.note}
    WHERE id=${id}
    RETURNING *;
  `;

  return mapWeight(rows[0]);
}

export async function deleteWeightByDayKey(input: { ownerKey: string; dayKey: string }): Promise<void>;
export async function deleteWeightByDayKey(ownerKey: string, dayKey: string): Promise<void>;
export async function deleteWeightByDayKey(
  ownerKeyOrInput: string | { ownerKey: string; dayKey: string },
  dayKey?: string
): Promise<void> {
  const { ownerKey, dayKey: key } = normalizeOwnerDayArgs(ownerKeyOrInput as any, dayKey as any);
  await ensureSchema();
  const sql = getDb();
  await sql`DELETE FROM weight_logs WHERE owner_key=${ownerKey} AND day_key=${key};`;
}
