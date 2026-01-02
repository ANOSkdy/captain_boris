import "server-only";

import { getDb } from "../client";
import { ensureSchema, newId } from "../schema";
import { DbRecord, toIsoString } from "../types";
import { DEFAULT_TZ, endOfDayUtcIso, startOfDayUtcIso } from "../../domain/dayKey";

export type WorkoutFields = {
  ownerKey: string;
  dayRef: string[]; // Link to Days (performedAt day)
  dayKey: string;
  performedAt: string; // ISO
  workoutType: string; // Run/Walk/Gym/Yoga/Other...
  durationMin: number;
  intensity?: string; // Low/Medium/High
  detail?: string;
  aiAssisted?: boolean;
};

type WorkoutRow = {
  id: string;
  owner_key: string;
  day_id: string;
  day_key: string;
  performed_at: string | Date;
  workout_type: string;
  duration_min: number;
  intensity: string | null;
  detail: string | null;
  ai_assisted: boolean | null;
  created_at: string | Date;
};

function mapWorkout(row: WorkoutRow): DbRecord<WorkoutFields> {
  return {
    id: row.id,
    createdTime: toIsoString(row.created_at),
    fields: {
      ownerKey: row.owner_key,
      dayRef: row.day_id ? [row.day_id] : [],
      dayKey: row.day_key,
      performedAt: toIsoString(row.performed_at),
      workoutType: row.workout_type,
      durationMin: row.duration_min,
      intensity: row.intensity ?? undefined,
      detail: row.detail ?? undefined,
      aiAssisted: row.ai_assisted ?? undefined,
    },
  };
}

async function findWorkoutRowById(id: string): Promise<WorkoutRow | null> {
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<WorkoutRow[]>`SELECT * FROM workout_logs WHERE id=${id} LIMIT 1;`;
  return rows[0] ?? null;
}

export async function listWorkoutsByOwnerAndDayKey(input: {
  ownerKey: string;
  dayKey: string;
  tz?: string;
}): Promise<DbRecord<WorkoutFields>[]>;
export async function listWorkoutsByOwnerAndDayKey(
  ownerKey: string,
  dayKey: string,
  tz?: string
): Promise<DbRecord<WorkoutFields>[]>;
export async function listWorkoutsByOwnerAndDayKey(
  ownerKeyOrInput: string | { ownerKey: string; dayKey: string; tz?: string },
  dayKey?: string,
  tz?: string
): Promise<DbRecord<WorkoutFields>[]> {
  const { ownerKey, dayKey: key, tz: zone } = typeof ownerKeyOrInput === "string"
    ? { ownerKey: ownerKeyOrInput, dayKey: dayKey ?? "", tz }
    : ownerKeyOrInput;
  if (!key) throw new Error("dayKey is required");
  const rangeTz = zone ?? DEFAULT_TZ;
  const startAt = startOfDayUtcIso(key, rangeTz);
  const endAt = endOfDayUtcIso(key, rangeTz);
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<WorkoutRow[]>`
    SELECT * FROM workout_logs WHERE owner_key=${ownerKey}
      AND performed_at >= ${startAt}
      AND performed_at <= ${endAt}
    ORDER BY performed_at ASC;
  `;

  return rows.map(mapWorkout);
}

export async function listWorkoutsByOwner(ownerKey: string): Promise<DbRecord<WorkoutFields>[]> {
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<WorkoutRow[]>`
    SELECT * FROM workout_logs WHERE owner_key=${ownerKey}
    ORDER BY performed_at DESC;
  `;

  return rows.map(mapWorkout);
}

export async function listWorkoutsByOwnerFiltered(input: {
  ownerKey: string;
  workoutType?: string;
  menuKeyword?: string;
}): Promise<DbRecord<WorkoutFields>[]> {
  await ensureSchema();
  const sql = getDb();

  const rows = await sql<WorkoutRow[]>`
    SELECT * FROM workout_logs
    WHERE owner_key=${input.ownerKey}
      ${input.workoutType ? sql`AND LOWER(workout_type)=LOWER(${input.workoutType})` : sql``}
      ${input.menuKeyword ? sql`AND detail ILIKE ${"%" + input.menuKeyword + "%"}` : sql``}
    ORDER BY performed_at DESC;
  `;

  return rows.map(mapWorkout);
}

export async function listWorkoutTypes(ownerKey: string): Promise<string[]> {
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<{ workout_type: string | null }[]>`
    SELECT DISTINCT workout_type FROM workout_logs WHERE owner_key=${ownerKey} ORDER BY workout_type ASC;
  `;

  return rows
    .map((r: { workout_type: string | null }) => r.workout_type)
    .filter((v: string | null): v is string => Boolean(v));
}

export async function createWorkout(input: {
  ownerKey: string;
  dayId: string;
  dayKey: string;
  performedAt: string;
  workoutType: string;
  durationMin: number;
  intensity?: string;
  detail?: string;
  aiAssisted?: boolean;
}): Promise<DbRecord<WorkoutFields>> {
  await ensureSchema();
  const sql = getDb();
  const id = newId();

  const rows = await sql<WorkoutRow[]>`
    INSERT INTO workout_logs (id, owner_key, day_id, day_key, performed_at, workout_type, duration_min, intensity, detail, ai_assisted)
    VALUES (${id}, ${input.ownerKey}, ${input.dayId}, ${input.dayKey}, ${input.performedAt}, ${input.workoutType}, ${input.durationMin}, ${input.intensity ?? null}, ${input.detail ?? null}, ${input.aiAssisted ?? null})
    RETURNING *;
  `;

  return mapWorkout(rows[0]);
}

export async function updateWorkoutById(
  id: string,
  fields: Partial<WorkoutFields>
): Promise<DbRecord<WorkoutFields>> {
  const existing = await findWorkoutRowById(id);
  if (!existing) throw new Error(`Workout not found: ${id}`);

  const next = {
    owner_key: fields.ownerKey ?? existing.owner_key,
    day_id: fields.dayRef?.[0] ?? existing.day_id,
    day_key: fields.dayKey ?? existing.day_key,
    performed_at: fields.performedAt ?? existing.performed_at,
    workout_type: fields.workoutType ?? existing.workout_type,
    duration_min: fields.durationMin ?? existing.duration_min,
    intensity: fields.intensity ?? existing.intensity,
    detail: fields.detail ?? existing.detail,
    ai_assisted: fields.aiAssisted ?? existing.ai_assisted,
  };

  await ensureSchema();
  const sql = getDb();
  const rows = await sql<WorkoutRow[]>`
    UPDATE workout_logs
    SET owner_key=${next.owner_key}, day_id=${next.day_id}, day_key=${next.day_key}, performed_at=${next.performed_at},
      workout_type=${next.workout_type}, duration_min=${next.duration_min}, intensity=${next.intensity}, detail=${next.detail},
      ai_assisted=${next.ai_assisted}
    WHERE id=${id}
    RETURNING *;
  `;

  return mapWorkout(rows[0]);
}

export async function deleteWorkoutById(id: string): Promise<void> {
  await ensureSchema();
  const sql = getDb();
  await sql`DELETE FROM workout_logs WHERE id=${id};`;
}
