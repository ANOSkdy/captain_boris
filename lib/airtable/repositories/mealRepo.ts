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

export type MealFields = {
  ownerKey: string;
  dayRef: string[]; // Link to Days (eatenAt day)
  dayKey: string;
  eatenAt: string; // ISO
  mealType: string; // Breakfast/Lunch/Dinner/Snack
  text: string;
  itemsJson?: string;
  caloriesKcal?: number;
  note?: string;
  aiAssisted?: boolean;
};

const TABLE = getTableName("AIRTABLE_TABLE_MEAL", "MealLogs");

export async function listMealsByOwnerAndDayKey(input: {
  ownerKey: string;
  dayKey: string;
}): Promise<AirtableRecord<MealFields>[]> {
  const fOwner = escapeFormulaValue(input.ownerKey);
  const fDayKey = escapeFormulaValue(input.dayKey);

  const filterByFormula =
    "AND({ownerKey}='" + fOwner + "', {dayKey}='" + fDayKey + "')";

  return listAll<MealFields>(TABLE, {
    filterByFormula,
    sort: [{ field: "eatenAt", direction: "asc" }],
    pageSize: 100,
    tags: tagsForDay(input.ownerKey, input.dayKey),
  });
}

export async function createMeal(input: {
  ownerKey: string;
  dayId: string;
  dayKey: string;
  eatenAt: string;
  mealType: string;
  text: string;
  itemsJson?: string;
  caloriesKcal?: number;
  note?: string;
  aiAssisted?: boolean;
}): Promise<AirtableRecord<MealFields>> {
  const fields: MealFields = {
    ownerKey: input.ownerKey,
    dayRef: [input.dayId],
    dayKey: input.dayKey,
    eatenAt: input.eatenAt,
    mealType: input.mealType,
    text: input.text,
    itemsJson: input.itemsJson,
    caloriesKcal: input.caloriesKcal,
    note: input.note,
    aiAssisted: input.aiAssisted,
  };
  return createOne<MealFields>(TABLE, fields, { typecast: true });
}

export async function updateMealById(
  id: string,
  fields: Partial<MealFields>
): Promise<AirtableRecord<MealFields>> {
  return updateOne<MealFields>(TABLE, id, fields, { typecast: true });
}

export async function deleteMealById(id: string): Promise<void> {
  await deleteOne(TABLE, id);
}
