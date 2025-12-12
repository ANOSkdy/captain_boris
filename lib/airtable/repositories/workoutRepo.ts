import "server-only";

import {
  AirtableRecord,
  createOne,
  deleteOne,
  escapeFormulaValue,
  getTableName,
  listAll,
  updateOne,
} from "../client";
import { tagsForDay } from "@/lib/cache/tags";

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

const TABLE = getTableName("AIRTABLE_TABLE_WORKOUT", "WorkoutLogs");

export async function listWorkoutsByOwnerAndDayKey(input: {
  ownerKey: string;
  dayKey: string;
}): Promise<AirtableRecord<WorkoutFields>[]> {
  const fOwner = escapeFormulaValue(input.ownerKey);
  const fDayKey = escapeFormulaValue(input.dayKey);

  const filterByFormula =
    "AND({ownerKey}='" + fOwner + "', {dayKey}='" + fDayKey + "')";

  return listAll<WorkoutFields>(TABLE, {
    filterByFormula,
    sort: [{ field: "performedAt", direction: "asc" }],
    pageSize: 100,
    tags: tagsForDay(input.ownerKey, input.dayKey),
  });
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
}): Promise<AirtableRecord<WorkoutFields>> {
  const fields: WorkoutFields = {
    ownerKey: input.ownerKey,
    dayRef: [input.dayId],
    dayKey: input.dayKey,
    performedAt: input.performedAt,
    workoutType: input.workoutType,
    durationMin: input.durationMin,
    intensity: input.intensity,
    detail: input.detail,
    aiAssisted: input.aiAssisted,
  };
  return createOne<WorkoutFields>(TABLE, fields, { typecast: true });
}

export async function updateWorkoutById(
  id: string,
  fields: Partial<WorkoutFields>
): Promise<AirtableRecord<WorkoutFields>> {
  return updateOne<WorkoutFields>(TABLE, id, fields, { typecast: true });
}

export async function deleteWorkoutById(id: string): Promise<void> {
  await deleteOne(TABLE, id);
}
