"use server";

import { z } from "zod";

import { upsertDay } from "@/lib/airtable/repositories/daysRepo";
import { createMeal, deleteMealById, updateMealById } from "@/lib/airtable/repositories/mealRepo";

import { getAppTz, getOwnerKey, nowIso } from "@/lib/actions/common";
import { ok, fail, type ActionResult, toErrorMessage } from "@/lib/actions/result";
import { toDayKey } from "@/lib/domain/dayKey";
import { mealInputSchema } from "@/lib/domain/validators";
import { invalidateDay, invalidateOwner } from "@/lib/cache/revalidate";

const addArgsSchema = z.object({
  ownerKey: z.string().optional(),
  dayKey: z.string().optional(),
  eatenAt: z.string().optional(),
  mealType: z.string(),
  text: z.string(),
  itemsJson: z.string().optional(),
  caloriesKcal: z.number().optional(),
  note: z.string().optional(),
  aiAssisted: z.boolean().optional(),
});

export async function addMeal(
  args: z.infer<typeof addArgsSchema>
): Promise<ActionResult<{ recordId: string; dayKey: string }>> {
  try {
    const a = addArgsSchema.parse(args);

    const ownerKey = a.ownerKey ?? getOwnerKey();
    const tz = getAppTz();

    const eatenAt = a.eatenAt ?? nowIso();
    const dayKey = a.dayKey ?? toDayKey(eatenAt, tz);

    const parsed = mealInputSchema.parse({
      ownerKey,
      dayKey,
      eatenAt,
      mealType: a.mealType,
      text: a.text,
      itemsJson: a.itemsJson,
      caloriesKcal: a.caloriesKcal,
      note: a.note,
      aiAssisted: a.aiAssisted,
    });

    const { dayId } = await upsertDay({ ownerKey: parsed.ownerKey, dayKey: parsed.dayKey, dayDate: parsed.dayKey });

    const created = await createMeal({
      ownerKey: parsed.ownerKey,
      dayId,
      dayKey: parsed.dayKey,
      eatenAt: parsed.eatenAt,
      mealType: parsed.mealType,
      text: parsed.text,
      itemsJson: parsed.itemsJson,
      caloriesKcal: parsed.caloriesKcal,
      note: parsed.note,
      aiAssisted: parsed.aiAssisted,
    });

    invalidateDay(ownerKey, parsed.dayKey);
    return ok({ recordId: created.id, dayKey: parsed.dayKey });
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}

const updateArgsSchema = mealInputSchema.partial().extend({
  id: z.string().min(1),
  eatenAt: z.string().optional(),
});

export async function updateMeal(
  args: z.infer<typeof updateArgsSchema>
): Promise<ActionResult<{ recordId: string; dayKey: string }>> {
  try {
    const a = updateArgsSchema.parse(args);

    const ownerKey = a.ownerKey ?? getOwnerKey();
    const tz = getAppTz();

    const nextDayKey = a.dayKey ?? (a.eatenAt ? toDayKey(a.eatenAt, tz) : undefined);
    const dayUpsert = nextDayKey ? await upsertDay({ ownerKey, dayKey: nextDayKey, dayDate: nextDayKey }) : null;

    const patch: any = {};

    if (a.ownerKey != null) patch.ownerKey = ownerKey;
    if (a.eatenAt != null) patch.eatenAt = a.eatenAt;
    if (a.mealType != null) patch.mealType = a.mealType;
    if (a.text != null) patch.text = a.text;
    if (a.itemsJson !== undefined) patch.itemsJson = a.itemsJson;
    if (a.caloriesKcal !== undefined) patch.caloriesKcal = a.caloriesKcal;
    if (a.note !== undefined) patch.note = a.note;
    if (a.aiAssisted !== undefined) patch.aiAssisted = a.aiAssisted;

    if (nextDayKey && dayUpsert?.dayId) {
      patch.dayKey = nextDayKey;
      patch.dayRef = [dayUpsert.dayId];
      patch.ownerKey = ownerKey;
    }

    const updated = await updateMealById(a.id, patch);
    const affectedDayKey = nextDayKey ?? updated.fields.dayKey;

    invalidateDay(ownerKey, affectedDayKey);
    invalidateOwner(ownerKey); // covers potential move from a different dayKey

    return ok({ recordId: updated.id, dayKey: affectedDayKey });
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}

const deleteArgsSchema = z.object({
  id: z.string().min(1),
});

export async function deleteMeal(
  args: z.infer<typeof deleteArgsSchema>
): Promise<ActionResult<{ recordId: string }>> {
  try {
    const a = deleteArgsSchema.parse(args);
    await deleteMealById(a.id);

    // We don't know dayKey here -> invalidate owner-wide
    invalidateOwner(getOwnerKey());

    return ok({ recordId: a.id });
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}