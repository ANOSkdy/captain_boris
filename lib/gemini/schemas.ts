import { z } from "zod";

export const mealAssistSchema = z.object({
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]).optional(),
  items: z.array(z.string().min(1)).max(50),
  notes: z.string().max(500).optional(),
});

export type MealAssistOutput = z.infer<typeof mealAssistSchema>;

export const workoutAssistSchema = z.object({
  workoutType: z.enum(["Run", "Walk", "Gym", "Yoga", "Other"]).optional(),
  durationMin: z.number().int().min(1).max(600).optional(),
  intensity: z.enum(["Low", "Medium", "High"]).optional(),
  detail: z.string().max(2000).optional(),
});

export type WorkoutAssistOutput = z.infer<typeof workoutAssistSchema>;