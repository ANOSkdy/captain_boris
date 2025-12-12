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

const TABLE = getTableName("AIRTABLE_TABLE_SLEEP", "SleepLogs");

export async function findSleepByOwnerAndDayKey(
  ownerKey: string,
  dayKey: string
): Promise<AirtableRecord<SleepFields> | null> {
  const fOwner = escapeFormulaValue(ownerKey);
  const fDayKey = escapeFormulaValue(dayKey);

  const filterByFormula =
    "AND({ownerKey}='" + fOwner + "', {dayKey}='" + fDayKey + "')";

  const records = await listAll<SleepFields>(TABLE, {
    filterByFormula,
    maxRecords: 1,
    tags: tagsForDay(ownerKey, dayKey),
  });
  return records[0] ?? null;
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
}): Promise<AirtableRecord<SleepFields>> {
  const fields: SleepFields = {
    ownerKey: input.ownerKey,
    dayRef: [input.dayId],
    dayKey: input.dayKey,
    sleepStartAt: input.sleepStartAt,
    sleepEndAt: input.sleepEndAt,
    durationMin: input.durationMin,
    quality: input.quality,
    note: input.note,
  };
  return createOne<SleepFields>(TABLE, fields, { typecast: true });
}

export async function updateSleepById(
  id: string,
  fields: Partial<SleepFields>
): Promise<AirtableRecord<SleepFields>> {
  return updateOne<SleepFields>(TABLE, id, fields, { typecast: true });
}

export async function deleteSleepByDayKey(input: {
  ownerKey: string;
  dayKey: string;
}): Promise<void> {
  const existing = await findSleepByOwnerAndDayKey(input.ownerKey, input.dayKey);
  if (!existing) return; // idempotent
  await deleteOne(TABLE, existing.id);
}
