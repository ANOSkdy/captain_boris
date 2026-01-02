import "server-only";

export type JournalAttachment = {
  url: string;
  name?: string;
  mime?: string;
};

export function normalizeAttachments(raw: unknown): JournalAttachment[] {
  if (!Array.isArray(raw)) return [];

  const results: JournalAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const url = (item as any).url;
    if (typeof url !== "string" || url.trim().length === 0) continue;

    const name = (item as any).name;
    const mime = (item as any).mime;

    const cleaned: JournalAttachment = { url: url.trim() };
    if (typeof name === "string" && name.trim().length > 0) cleaned.name = name.trim();
    if (typeof mime === "string" && mime.trim().length > 0) cleaned.mime = mime.trim();

    results.push(cleaned);
  }

  return results;
}
