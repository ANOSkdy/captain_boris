"use server";

import { ok, fail, type ActionResult, toErrorMessage } from "@/lib/actions/result";
import { generateJson, isGeminiConfigured } from "@/lib/gemini/client";
import { mealAssistSchema, type MealAssistOutput } from "@/lib/gemini/schemas";
import { buildMealAssistPrompt } from "@/lib/gemini/prompts";

export async function aiAssistMeal(args: {
  text: string;
}): Promise<ActionResult<MealAssistOutput>> {
  try {
    const text = (args?.text ?? "").trim();
    if (!text) return fail("Text is empty.");

    if (!isGeminiConfigured()) return fail("Gemini is not configured (missing GEMINI_API_KEY).");

    const prompt = buildMealAssistPrompt({ text });
    const json = await generateJson(prompt, { temperature: 0.2, maxOutputTokens: 512 });

    const parsed = mealAssistSchema.parse(json);
    return ok(parsed);
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}