import "server-only";

import {
  AirtableRecord,
  createOne,
  deleteOne,
  escapeFormulaValue,
  getTableName,
  listAll,
  updateOne,
} from "../client";
import { tagsForDay } from "@/lib/cache/tags";

export type WeightFields = {
  ownerKey: string;
  dayRef: string[]; // Link to Days (record ids)
  dayKey: string;
  recordedAt: string; // ISO datetime
  weightKg: number;
  bodyFatPct?: number;
  note?: string;
};

const TABLE = getTableName("AIRTABLE_TABLE_WEIGHT", "WeightLogs");

export async function findWeightByOwnerAndDayKey(
  ownerKey: string,
  dayKey: string
): Promise<AirtableRecord<WeightFields> | null> {
  const fOwner = escapeFormulaValue(ownerKey);
  const fDayKey = escapeFormulaValue(dayKey);

  const filterByFormula =
    "AND({ownerKey}='" + fOwner + "', {dayKey}='" + fDayKey + "')";

  const records = await listAll<WeightFields>(TABLE, {
    filterByFormula,
    maxRecords: 1,
    tags: tagsForDay(ownerKey, dayKey),
  });
  return records[0] ?? null;
}

export async function createWeight(input: {
  ownerKey: string;
  dayId: string;
  dayKey: string;
  recordedAt: string; // ISO
  weightKg: number;
  bodyFatPct?: number;
  note?: string;
}): Promise<AirtableRecord<WeightFields>> {
  const fields: WeightFields = {
    ownerKey: input.ownerKey,
    dayRef: [input.dayId],
    dayKey: input.dayKey,
    recordedAt: input.recordedAt,
    weightKg: input.weightKg,
    bodyFatPct: input.bodyFatPct,
    note: input.note,
  };
  return createOne<WeightFields>(TABLE, fields, { typecast: true });
}

export async function updateWeightById(
  id: string,
  fields: Partial<WeightFields>
): Promise<AirtableRecord<WeightFields>> {
  return updateOne<WeightFields>(TABLE, id, fields, { typecast: true });
}

export async function deleteWeightByDayKey(input: {
  ownerKey: string;
  dayKey: string;
}): Promise<void> {
  const existing = await findWeightByOwnerAndDayKey(input.ownerKey, input.dayKey);
  if (!existing) return; // idempotent
  await deleteOne(TABLE, existing.id);
}
