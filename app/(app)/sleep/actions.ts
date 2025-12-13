"use server";

import { z } from "zod";

import { upsertDay } from "@/lib/db/repositories/daysRepo";
import {
  createSleep,
  deleteSleepByDayKey,
  findSleepByOwnerAndDayKey,
  updateSleepById,
} from "@/lib/db/repositories/sleepRepo";

import { getAppTz, getOwnerKey } from "@/lib/actions/common";
import { ok, fail, type ActionResult, toErrorMessage } from "@/lib/actions/result";
import { toDayKey } from "@/lib/domain/dayKey";
import { calcDurationMin } from "@/lib/domain/calc";
import { sleepInputSchema } from "@/lib/domain/validators";
import { invalidateDay } from "@/lib/cache/revalidate";

const saveArgsSchema = z.object({
  ownerKey: z.string().optional(),
  dayKey: z.string().optional(), // optional; if omitted, computed from sleepEndAt in TZ
  sleepStartAt: z.string(),
  sleepEndAt: z.string(),
  quality: z.string().optional(),
  note: z.string().optional(),
});

export async function saveSleep(
  args: z.infer<typeof saveArgsSchema>
): Promise<ActionResult<{ recordId: string; dayKey: string; mode: "created" | "updated"; durationMin: number }>> {
  try {
    const a = saveArgsSchema.parse(args);

    const ownerKey = a.ownerKey ?? getOwnerKey();
    const tz = getAppTz();

    const dayKey = a.dayKey ?? toDayKey(a.sleepEndAt, tz); // wake-up day
    const durationMin = calcDurationMin(a.sleepStartAt, a.sleepEndAt);

    const parsed = sleepInputSchema.parse({
      ownerKey,
      dayKey,
      sleepStartAt: a.sleepStartAt,
      sleepEndAt: a.sleepEndAt,
      durationMin,
      quality: a.quality,
      note: a.note,
    });

    const { dayId } = await upsertDay({ ownerKey: parsed.ownerKey, dayKey: parsed.dayKey, dayDate: parsed.dayKey });

    const existing = await findSleepByOwnerAndDayKey(ownerKey, dayKey);
    if (existing) {
      const updated = await updateSleepById(existing.id, {
        sleepStartAt: parsed.sleepStartAt,
        sleepEndAt: parsed.sleepEndAt,
        durationMin: parsed.durationMin,
        quality: parsed.quality,
        note: parsed.note,
        dayRef: [dayId],
        dayKey: parsed.dayKey,
        ownerKey: parsed.ownerKey,
      });

      invalidateDay(ownerKey, dayKey);
      return ok({ recordId: updated.id, dayKey, mode: "updated", durationMin: parsed.durationMin });
    }

    const created = await createSleep({
      ownerKey,
      dayId,
      dayKey,
      sleepStartAt: parsed.sleepStartAt,
      sleepEndAt: parsed.sleepEndAt,
      durationMin: parsed.durationMin,
      quality: parsed.quality,
      note: parsed.note,
    });

    invalidateDay(ownerKey, dayKey);
    return ok({ recordId: created.id, dayKey, mode: "created", durationMin: parsed.durationMin });
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}

const deleteArgsSchema = z.object({
  ownerKey: z.string().optional(),
  dayKey: z.string().optional(),
});

export async function deleteSleep(
  args: z.infer<typeof deleteArgsSchema>
): Promise<ActionResult<{ dayKey: string }>> {
  try {
    const a = deleteArgsSchema.parse(args);

    const ownerKey = a.ownerKey ?? getOwnerKey();
    const tz = getAppTz();
    const dayKey = a.dayKey ?? toDayKey(new Date(), tz);

    await deleteSleepByDayKey({ ownerKey, dayKey });
    invalidateDay(ownerKey, dayKey);

    return ok({ dayKey });
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}