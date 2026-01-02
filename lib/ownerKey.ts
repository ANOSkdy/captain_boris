import "server-only";

export const OWNER_KEY_FALLBACK = "default";

export function resolveOwnerKey(): string {
  const raw = process.env.OWNER_KEY ?? OWNER_KEY_FALLBACK;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : OWNER_KEY_FALLBACK;
}
