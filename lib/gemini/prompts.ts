type MealAssistInput = {
  text: string;
};

type WorkoutAssistInput = {
  text: string;
};

export function buildMealAssistPrompt(input: MealAssistInput): string {
  return [
    "You are a strict JSON generator.",
    "Return ONLY valid JSON. No markdown, no code fences, no extra keys.",
    "Schema:",
    '{ "mealType": "Breakfast|Lunch|Dinner|Snack", "items": ["string"], "notes": "string?" }',
    "Rules:",
    "- items must be an array of food/drink items extracted from the text.",
    "- If mealType cannot be inferred, omit mealType.",
    "- If there are useful notes (portion size, brand, etc.), put them in notes.",
    "",
    "Input text:",
    input.text,
  ].join("\n");
}

export function buildWorkoutAssistPrompt(input: WorkoutAssistInput): string {
  return [
    "You are a strict JSON generator.",
    "Return ONLY valid JSON. No markdown, no code fences, no extra keys.",
    "Schema:",
    '{ "workoutType": "Run|Walk|Gym|Yoga|Other", "durationMin": 30, "intensity": "Low|Medium|High", "detail": "string?" }',
    "Rules:",
    "- workoutType: choose best match; if unclear, use Other.",
    "- durationMin: infer minutes if described; otherwise omit.",
    "- intensity: Low/Medium/High if inferable; otherwise omit.",
    "- detail: short clarified summary (optional).",
    "",
    "Input text:",
    input.text,
  ].join("\n");
}