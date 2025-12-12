import { z } from "zod";

const dayKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dayKey must be YYYY-MM-DD");

const isoDateTimeSchema = z.string().min(1, "datetime is required");

export const ownerKeySchema = z.string().min(1).max(64);

export const weightInputSchema = z.object({
  ownerKey: ownerKeySchema,
  dayKey: dayKeySchema,
  recordedAt: isoDateTimeSchema,
  weightKg: z.number().min(20).max(300),
  bodyFatPct: z.number().min(1).max(80).optional(),
  note: z.string().max(500).optional(),
});

export const sleepInputSchema = z.object({
  ownerKey: ownerKeySchema,
  dayKey: dayKeySchema, // wake-up dayKey
  sleepStartAt: isoDateTimeSchema,
  sleepEndAt: isoDateTimeSchema,
  durationMin: z.number().int().min(0).max(7 * 24 * 60),
  quality: z.string().max(32).optional(),
  note: z.string().max(500).optional(),
});

export const mealInputSchema = z.object({
  ownerKey: ownerKeySchema,
  dayKey: dayKeySchema,
  eatenAt: isoDateTimeSchema,
  mealType: z.string().min(1).max(32),
  text: z.string().min(1).max(2000),
  itemsJson: z.string().max(20000).optional(),
  caloriesKcal: z.number().min(0).max(10000).optional(),
  note: z.string().max(500).optional(),
  aiAssisted: z.boolean().optional(),
});

export const workoutInputSchema = z.object({
  ownerKey: ownerKeySchema,
  dayKey: dayKeySchema,
  performedAt: isoDateTimeSchema,
  workoutType: z.string().min(1).max(64),
  durationMin: z.number().int().min(0).max(7 * 24 * 60),
  intensity: z.string().max(32).optional(),
  detail: z.string().max(2000).optional(),
  aiAssisted: z.boolean().optional(),
});

export type WeightInput = z.infer<typeof weightInputSchema>;
export type SleepInput = z.infer<typeof sleepInputSchema>;
export type MealInput = z.infer<typeof mealInputSchema>;
export type WorkoutInput = z.infer<typeof workoutInputSchema>;