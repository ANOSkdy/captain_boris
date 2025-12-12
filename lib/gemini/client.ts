import "server-only";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  promptFeedback?: unknown;
};

export type GeminiOptions = {
  model?: string; // e.g., gemini-1.5-flash
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

function getRequiredEnv(name: string): string {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extractJsonString(text: string): string {
  const t = (text ?? "").trim();

  // Prefer fenced json blocks
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) return fence[1].trim();

  // Fallback: first {...} span
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last >= 0 && last > first) {
    return t.slice(first, last + 1).trim();
  }

  return t;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal, cache: "no-store" });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Call Gemini and return parsed JSON.
 * - Server-only
 * - Prompt MUST instruct "JSON only"
 * - This function tries to extract JSON even if Gemini returns code fences.
 */
export async function generateJson(prompt: string, opts: GeminiOptions = {}): Promise<unknown> {
  const apiKey = getRequiredEnv("GEMINI_API_KEY");
  const model = opts.model ?? getEnv("GEMINI_MODEL") ?? "gemini-1.5-flash";
  const temperature = opts.temperature ?? 0.2;
  const maxOutputTokens = opts.maxOutputTokens ?? 512;
  const timeoutMs = opts.timeoutMs ?? 15000;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      timeoutMs
    );

    if (res.ok) {
      const json = (await res.json()) as GeminiGenerateContentResponse;
      const parts = json.candidates?.[0]?.content?.parts ?? [];
      const text = parts.map((p) => p.text ?? "").join("").trim();

      const rawJson = extractJsonString(text);
      try {
        return JSON.parse(rawJson);
      } catch (e) {
        throw new Error(`Gemini returned non-JSON: ${rawJson.slice(0, 300)}`);
      }
    }

    const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
    if (!retryable || attempt === 3) {
      const t = await res.text().catch(() => "");
      throw new Error(`Gemini request failed: ${res.status} ${res.statusText} ${t}`);
    }

    const backoff = 300 * Math.pow(2, attempt) + Math.floor(Math.random() * 80);
    await sleep(backoff);
  }

  throw new Error("Gemini request failed after retries.");
}

export function isGeminiConfigured(): boolean {
  return Boolean(getEnv("GEMINI_API_KEY"));
}