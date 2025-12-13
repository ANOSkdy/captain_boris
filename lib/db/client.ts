import "server-only";

import { databaseConfigHint, isDatabaseConfigured } from "./isConfigured";

type Sql = any;
type PostgresFactory = (url: string, opts?: Record<string, unknown>) => Sql;
let client: Sql | null = null;

export function getDatabaseUrl(): string {
  if (!isDatabaseConfigured()) {
    throw new Error(`Postgres connection env is missing. ${databaseConfigHint()}`);
  }

  const candidates = [
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
    process.env.NEON_DATABASE_URL,
  ];

  const url = candidates.find((v) => typeof v === "string" && v.length > 0);
  if (!url) {
    throw new Error(`Postgres connection env is missing. ${databaseConfigHint()}`);
  }
  return url;
}

export function getDb(): Sql {
  if (!client) {
    const postgres = loadPostgres();
    client = postgres(getDatabaseUrl(), {
      max: 1,
      prepare: false,
    });
  }
  return client;
}

function loadPostgres(): PostgresFactory {
  const moduleName = "post" + "gres";
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(moduleName);
  const fn = mod.default ?? mod;
  if (typeof fn !== "function") {
    throw new Error("postgres export is not a function");
  }
  return fn as PostgresFactory;
}
