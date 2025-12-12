import "server-only";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import {
  AirtableRecord,
  createOne,
  escapeFormulaValue,
  getEnvOr,
  getTableName,
  listAll,
} from "../client";
import { tagsForDay, tagsForMonth } from "@/lib/cache/tags";

dayjs.extend(utc);
dayjs.extend(timezone);

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

const TABLE = getTableName("AIRTABLE_TABLE_DAYS", "Days");
const TZ = getEnvOr("APP_TZ", "Asia/Tokyo");

function toDateOnly(dateStr: string): string {
  return dayjs.tz(dateStr, TZ).format("YYYY-MM-DD");
}

function dayMinusOne(dateStr: string): string {
  return dayjs.tz(dateStr, TZ).subtract(1, "day").format("YYYY-MM-DD");
}

export async function findDayByOwnerAndKey(
  ownerKey: string,
  dayKey: string
): Promise<AirtableRecord<DaysFields> | null> {
  const fOwner = escapeFormulaValue(ownerKey);
  const fDayKey = escapeFormulaValue(dayKey);

  const filterByFormula =
    "AND({ownerKey}='" + fOwner + "', {dayKey}='" + fDayKey + "')";

  const records = await listAll<DaysFields>(TABLE, {
    filterByFormula,
    maxRecords: 1,
    tags: tagsForDay(ownerKey, dayKey),
  });

  return records[0] ?? null;
}

export async function createDay(input: {
  ownerKey: string;
  dayKey: string;
  dayDate: string; // YYYY-MM-DD
}): Promise<AirtableRecord<DaysFields>> {
  const fields: DaysFields = {
    ownerKey: input.ownerKey,
    dayKey: input.dayKey,
    dayDate: toDateOnly(input.dayDate),
  };
  return createOne<DaysFields>(TABLE, fields, { typecast: true });
}

export async function upsertDay(input: {
  ownerKey: string;
  dayKey: string;
  dayDate: string; // YYYY-MM-DD
}): Promise<{ dayId: string }> {
  const existing = await findDayByOwnerAndKey(input.ownerKey, input.dayKey);
  if (existing) return { dayId: existing.id };

  const created = await createDay(input);
  return { dayId: created.id };
}

export async function listDaysByDateRange(input: {
  ownerKey: string;
  startInclusive: string; // YYYY-MM-DD
  endExclusive: string; // YYYY-MM-DD
}): Promise<AirtableRecord<DaysFields>[]> {
  const start = toDateOnly(input.startInclusive);
  const end = toDateOnly(input.endExclusive);
  const startEx = dayMinusOne(start); // Airtable IS_AFTER is strictly after

  const fOwner = escapeFormulaValue(input.ownerKey);

  const filterByFormula =
    "AND({ownerKey}='" + fOwner + "', " +
    "IS_AFTER({dayDate}, '" + startEx + "'), " +
    "IS_BEFORE({dayDate}, '" + end + "'))";

  const month = start.slice(0, 7); // YYYY-MM

  return listAll<DaysFields>(TABLE, {
    filterByFormula,
    sort: [{ field: "dayDate", direction: "asc" }],
    pageSize: 100,
    tags: tagsForMonth(input.ownerKey, month),
  });
}
