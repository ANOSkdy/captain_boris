"use server";

import { ok, fail, type ActionResult, toErrorMessage } from "@/lib/actions/result";
import { generateJson, isGeminiConfigured } from "@/lib/gemini/client";
import { workoutAssistSchema, type WorkoutAssistOutput } from "@/lib/gemini/schemas";
import { buildWorkoutAssistPrompt } from "@/lib/gemini/prompts";

export async function aiAssistWorkout(args: {
  text: string;
}): Promise<ActionResult<WorkoutAssistOutput>> {
  try {
    const text = (args?.text ?? "").trim();
    if (!text) return fail("Text is empty.");

    if (!isGeminiConfigured()) return fail("Gemini is not configured (missing GEMINI_API_KEY).");

    const prompt = buildWorkoutAssistPrompt({ text });
    const json = await generateJson(prompt, { temperature: 0.2, maxOutputTokens: 512 });

    const parsed = workoutAssistSchema.parse(json);
    return ok(parsed);
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}