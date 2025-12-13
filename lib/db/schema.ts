import "server-only";

import { randomUUID } from "crypto";

import { getDb } from "./client";

let initialized = false;

export async function ensureSchema(): Promise<void> {
  if (initialized) return;
  const sql = getDb();

  await sql`CREATE TABLE IF NOT EXISTS days (
    id text PRIMARY KEY,
    owner_key text NOT NULL DEFAULT 'default',
    day_key text NOT NULL,
    day_date date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(owner_key, day_key)
  );`;

  await sql`CREATE TABLE IF NOT EXISTS weight_logs (
    id text PRIMARY KEY,
    owner_key text NOT NULL DEFAULT 'default',
    day_id text NOT NULL,
    day_key text NOT NULL,
    recorded_at timestamptz NOT NULL,
    weight_kg double precision NOT NULL,
    body_fat_pct double precision,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
  );`;

  await sql`CREATE TABLE IF NOT EXISTS sleep_logs (
    id text PRIMARY KEY,
    owner_key text NOT NULL DEFAULT 'default',
    day_id text NOT NULL,
    day_key text NOT NULL,
    sleep_start_at timestamptz NOT NULL,
    sleep_end_at timestamptz NOT NULL,
    duration_min integer NOT NULL,
    quality text,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
  );`;

  await sql`CREATE TABLE IF NOT EXISTS meal_logs (
    id text PRIMARY KEY,
    owner_key text NOT NULL DEFAULT 'default',
    day_id text NOT NULL,
    day_key text NOT NULL,
    eaten_at timestamptz NOT NULL,
    meal_type text NOT NULL,
    text text NOT NULL,
    items_json text,
    calories_kcal integer,
    note text,
    ai_assisted boolean,
    created_at timestamptz NOT NULL DEFAULT now()
  );`;

  await sql`CREATE TABLE IF NOT EXISTS workout_logs (
    id text PRIMARY KEY,
    owner_key text NOT NULL DEFAULT 'default',
    day_id text NOT NULL,
    day_key text NOT NULL,
    performed_at timestamptz NOT NULL,
    workout_type text NOT NULL,
    duration_min integer NOT NULL,
    intensity text,
    detail text,
    ai_assisted boolean,
    created_at timestamptz NOT NULL DEFAULT now()
  );`;

  await sql`CREATE INDEX IF NOT EXISTS idx_days_owner_day_key ON days(owner_key, day_key);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_weight_owner_day_key ON weight_logs(owner_key, day_key);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sleep_owner_day_key ON sleep_logs(owner_key, day_key);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_meal_owner_day_key ON meal_logs(owner_key, day_key);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_workout_owner_day_key ON workout_logs(owner_key, day_key);`;

  initialized = true;
}

export function newId(): string {
  return randomUUID();
}
