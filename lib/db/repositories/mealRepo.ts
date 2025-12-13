import "server-only";

import { getDb } from "../client";
import { ensureSchema, newId } from "../schema";
import { DbRecord, normalizeOwnerDayArgs, toIsoString } from "../types";

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

type MealRow = {
  id: string;
  owner_key: string;
  day_id: string;
  day_key: string;
  eaten_at: string | Date;
  meal_type: string;
  text: string;
  items_json: string | null;
  calories_kcal: number | null;
  note: string | null;
  ai_assisted: boolean | null;
  created_at: string | Date;
};

function mapMeal(row: MealRow): DbRecord<MealFields> {
  return {
    id: row.id,
    createdTime: toIsoString(row.created_at),
    fields: {
      ownerKey: row.owner_key,
      dayRef: row.day_id ? [row.day_id] : [],
      dayKey: row.day_key,
      eatenAt: toIsoString(row.eaten_at),
      mealType: row.meal_type,
      text: row.text,
      itemsJson: row.items_json ?? undefined,
      caloriesKcal: row.calories_kcal ?? undefined,
      note: row.note ?? undefined,
      aiAssisted: row.ai_assisted ?? undefined,
    },
  };
}

async function findMealRowById(id: string): Promise<MealRow | null> {
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<MealRow[]>`SELECT * FROM meal_logs WHERE id=${id} LIMIT 1;`;
  return rows[0] ?? null;
}

export async function listMealsByOwnerAndDayKey(input: { ownerKey: string; dayKey: string }): Promise<DbRecord<MealFields>[]>;
export async function listMealsByOwnerAndDayKey(ownerKey: string, dayKey: string): Promise<DbRecord<MealFields>[]>;
export async function listMealsByOwnerAndDayKey(
  ownerKeyOrInput: string | { ownerKey: string; dayKey: string },
  dayKey?: string
): Promise<DbRecord<MealFields>[]> {
  const { ownerKey, dayKey: key } = normalizeOwnerDayArgs(ownerKeyOrInput as any, dayKey as any);
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<MealRow[]>`
    SELECT * FROM meal_logs WHERE owner_key=${ownerKey} AND day_key=${key}
    ORDER BY eaten_at ASC;
  `;
  return rows.map(mapMeal);
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
}): Promise<DbRecord<MealFields>> {
  await ensureSchema();
  const sql = getDb();
  const id = newId();

  const rows = await sql<MealRow[]>`
    INSERT INTO meal_logs (id, owner_key, day_id, day_key, eaten_at, meal_type, text, items_json, calories_kcal, note, ai_assisted)
    VALUES (${id}, ${input.ownerKey}, ${input.dayId}, ${input.dayKey}, ${input.eatenAt}, ${input.mealType}, ${input.text}, ${input.itemsJson ?? null}, ${input.caloriesKcal ?? null}, ${input.note ?? null}, ${input.aiAssisted ?? null})
    RETURNING *;
  `;

  return mapMeal(rows[0]);
}

export async function updateMealById(
  id: string,
  fields: Partial<MealFields>
): Promise<DbRecord<MealFields>> {
  const existing = await findMealRowById(id);
  if (!existing) throw new Error(`Meal not found: ${id}`);

  const next = {
    owner_key: fields.ownerKey ?? existing.owner_key,
    day_id: fields.dayRef?.[0] ?? existing.day_id,
    day_key: fields.dayKey ?? existing.day_key,
    eaten_at: fields.eatenAt ?? existing.eaten_at,
    meal_type: fields.mealType ?? existing.meal_type,
    text: fields.text ?? existing.text,
    items_json: fields.itemsJson ?? existing.items_json,
    calories_kcal: fields.caloriesKcal ?? existing.calories_kcal,
    note: fields.note ?? existing.note,
    ai_assisted: fields.aiAssisted ?? existing.ai_assisted,
  };

  await ensureSchema();
  const sql = getDb();
  const rows = await sql<MealRow[]>`
    UPDATE meal_logs
    SET owner_key=${next.owner_key}, day_id=${next.day_id}, day_key=${next.day_key}, eaten_at=${next.eaten_at},
      meal_type=${next.meal_type}, text=${next.text}, items_json=${next.items_json}, calories_kcal=${next.calories_kcal},
      note=${next.note}, ai_assisted=${next.ai_assisted}
    WHERE id=${id}
    RETURNING *;
  `;

  return mapMeal(rows[0]);
}

export async function deleteMealById(id: string): Promise<void> {
  await ensureSchema();
  const sql = getDb();
  await sql`DELETE FROM meal_logs WHERE id=${id};`;
}
