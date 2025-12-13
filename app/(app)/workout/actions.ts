"use server";

import { z } from "zod";

import { upsertDay } from "@/lib/db/repositories/daysRepo";
import { createWorkout, deleteWorkoutById, updateWorkoutById } from "@/lib/db/repositories/workoutRepo";

import { getAppTz, getOwnerKey, nowIso } from "@/lib/actions/common";
import { ok, fail, type ActionResult, toErrorMessage } from "@/lib/actions/result";
import { toDayKey } from "@/lib/domain/dayKey";
import { workoutInputSchema } from "@/lib/domain/validators";
import { invalidateDay, invalidateOwner } from "@/lib/cache/revalidate";

const addArgsSchema = z.object({
  ownerKey: z.string().optional(),
  dayKey: z.string().optional(),
  performedAt: z.string().optional(),
  workoutType: z.string(),
  durationMin: z.number(),
  intensity: z.string().optional(),
  detail: z.string().optional(),
  aiAssisted: z.boolean().optional(),
});

export async function addWorkout(
  args: z.infer<typeof addArgsSchema>
): Promise<ActionResult<{ recordId: string; dayKey: string }>> {
  try {
    const a = addArgsSchema.parse(args);

    const ownerKey = a.ownerKey ?? getOwnerKey();
    const tz = getAppTz();

    const performedAt = a.performedAt ?? nowIso();
    const dayKey = a.dayKey ?? toDayKey(performedAt, tz);

    const parsed = workoutInputSchema.parse({
      ownerKey,
      dayKey,
      performedAt,
      workoutType: a.workoutType,
      durationMin: a.durationMin,
      intensity: a.intensity,
      detail: a.detail,
      aiAssisted: a.aiAssisted,
    });

    const { dayId } = await upsertDay({ ownerKey: parsed.ownerKey, dayKey: parsed.dayKey, dayDate: parsed.dayKey });

    const created = await createWorkout({
      ownerKey: parsed.ownerKey,
      dayId,
      dayKey: parsed.dayKey,
      performedAt: parsed.performedAt,
      workoutType: parsed.workoutType,
      durationMin: parsed.durationMin,
      intensity: parsed.intensity,
      detail: parsed.detail,
      aiAssisted: parsed.aiAssisted,
    });

    invalidateDay(ownerKey, parsed.dayKey);
    return ok({ recordId: created.id, dayKey: parsed.dayKey });
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}

const updateArgsSchema = workoutInputSchema.partial().extend({
  id: z.string().min(1),
  performedAt: z.string().optional(),
});

export async function updateWorkout(
  args: z.infer<typeof updateArgsSchema>
): Promise<ActionResult<{ recordId: string; dayKey: string }>> {
  try {
    const a = updateArgsSchema.parse(args);

    const ownerKey = a.ownerKey ?? getOwnerKey();
    const tz = getAppTz();

    const nextDayKey = a.dayKey ?? (a.performedAt ? toDayKey(a.performedAt, tz) : undefined);
    const dayUpsert = nextDayKey ? await upsertDay({ ownerKey, dayKey: nextDayKey, dayDate: nextDayKey }) : null;

    const patch: any = {};

    if (a.ownerKey != null) patch.ownerKey = ownerKey;
    if (a.performedAt != null) patch.performedAt = a.performedAt;
    if (a.workoutType != null) patch.workoutType = a.workoutType;
    if (a.durationMin !== undefined) patch.durationMin = a.durationMin;
    if (a.intensity !== undefined) patch.intensity = a.intensity;
    if (a.detail !== undefined) patch.detail = a.detail;
    if (a.aiAssisted !== undefined) patch.aiAssisted = a.aiAssisted;

    if (nextDayKey && dayUpsert?.dayId) {
      patch.dayKey = nextDayKey;
      patch.dayRef = [dayUpsert.dayId];
      patch.ownerKey = ownerKey;
    }

    const updated = await updateWorkoutById(a.id, patch);
    const affectedDayKey = nextDayKey ?? updated.fields.dayKey;

    invalidateDay(ownerKey, affectedDayKey);
    invalidateOwner(ownerKey);

    return ok({ recordId: updated.id, dayKey: affectedDayKey });
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}

const deleteArgsSchema = z.object({
  id: z.string().min(1),
});

export async function deleteWorkout(
  args: z.infer<typeof deleteArgsSchema>
): Promise<ActionResult<{ recordId: string }>> {
  try {
    const a = deleteArgsSchema.parse(args);
    await deleteWorkoutById(a.id);

    invalidateOwner(getOwnerKey());

    return ok({ recordId: a.id });
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}