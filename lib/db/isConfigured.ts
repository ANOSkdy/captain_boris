import "server-only";

const KEYS = [
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL",
  "NEON_DATABASE_URL",
] as const;

export function isDatabaseConfigured(): boolean {
  return KEYS.some((k) => typeof process.env[k] === "string" && process.env[k]!.length > 0);
}

export function databaseConfigHint(): string {
  const available = KEYS.filter((k) => typeof process.env[k] === "string" && process.env[k]!.length > 0);
  if (available.length) return `Using ${available[0]}`;
  return `Set one of: ${KEYS.join(", ")}`;
}
