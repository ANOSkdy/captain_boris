"use server";

import { z } from "zod";

import { upsertDay } from "@/lib/airtable/repositories/daysRepo";
import {
  createWeight,
  deleteWeightByDayKey,
  findWeightByOwnerAndDayKey,
  updateWeightById,
} from "@/lib/airtable/repositories/weightRepo";

import { getAppTz, getOwnerKey, nowIso } from "@/lib/actions/common";
import { ok, fail, type ActionResult, toErrorMessage } from "@/lib/actions/result";
import { toDayKey } from "@/lib/domain/dayKey";
import { weightInputSchema } from "@/lib/domain/validators";
import { invalidateDay } from "@/lib/cache/revalidate";

const saveArgsSchema = z.object({
  ownerKey: z.string().optional(),
  dayKey: z.string().optional(),
  recordedAt: z.string().optional(),
  weightKg: z.number(),
  bodyFatPct: z.number().optional(),
  note: z.string().optional(),
});

export async function saveWeight(
  args: z.infer<typeof saveArgsSchema>
): Promise<ActionResult<{ recordId: string; dayKey: string; mode: "created" | "updated" }>> {
  try {
    const a = saveArgsSchema.parse(args);

    const ownerKey = a.ownerKey ?? getOwnerKey();
    const tz = getAppTz();

    const recordedAt = a.recordedAt ?? nowIso();
    const dayKey = a.dayKey ?? toDayKey(recordedAt, tz);

    const parsed = weightInputSchema.parse({
      ownerKey,
      dayKey,
      recordedAt,
      weightKg: a.weightKg,
      bodyFatPct: a.bodyFatPct,
      note: a.note,
    });

    const { dayId } = await upsertDay({ ownerKey: parsed.ownerKey, dayKey: parsed.dayKey, dayDate: parsed.dayKey });

    const existing = await findWeightByOwnerAndDayKey(ownerKey, dayKey);
    if (existing) {
      const updated = await updateWeightById(existing.id, {
        recordedAt: parsed.recordedAt,
        weightKg: parsed.weightKg,
        bodyFatPct: parsed.bodyFatPct,
        note: parsed.note,
      });

      invalidateDay(ownerKey, dayKey);
      return ok({ recordId: updated.id, dayKey, mode: "updated" });
    }

    const created = await createWeight({
      ownerKey,
      dayId,
      dayKey,
      recordedAt: parsed.recordedAt,
      weightKg: parsed.weightKg,
      bodyFatPct: parsed.bodyFatPct,
      note: parsed.note,
    });

    invalidateDay(ownerKey, dayKey);
    return ok({ recordId: created.id, dayKey, mode: "created" });
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}

const deleteArgsSchema = z.object({
  ownerKey: z.string().optional(),
  dayKey: z.string().optional(),
});

export async function deleteWeight(
  args: z.infer<typeof deleteArgsSchema>
): Promise<ActionResult<{ dayKey: string }>> {
  try {
    const a = deleteArgsSchema.parse(args);

    const ownerKey = a.ownerKey ?? getOwnerKey();
    const tz = getAppTz();
    const dayKey = a.dayKey ?? toDayKey(new Date(), tz);

    await deleteWeightByDayKey({ ownerKey, dayKey });
    invalidateDay(ownerKey, dayKey);

    return ok({ dayKey });
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}