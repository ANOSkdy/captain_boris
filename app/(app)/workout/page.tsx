import "server-only";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { WorkoutForm } from "@/components/forms/WorkoutForm";

import type { DbRecord } from "@/lib/db/types";
import type { WorkoutFields } from "@/lib/db/repositories/workoutRepo";
import { listWorkoutsByOwnerAndDayKey } from "@/lib/db/repositories/workoutRepo";
import { isDatabaseConfigured, databaseConfigHint } from "@/lib/db/isConfigured";
import { getAppTz, getOwnerKey } from "@/lib/actions/common";
import { toDayKey } from "@/lib/domain/dayKey";

import { deleteWorkout } from "@/app/(app)/workout/actions";

dayjs.extend(utc);
dayjs.extend(timezone);

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pickParam(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function normalizeDay(input: string | undefined, tz: string): string {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  return toDayKey(new Date(), tz);
}

export default async function WorkoutPage({ searchParams }: { searchParams?: SearchParams }) {
  const tz = getAppTz();
  const ownerKey = getOwnerKey();
  const dayKey = normalizeDay(pickParam(searchParams?.day), tz);

  const base = dayjs.tz(dayKey, tz);
  const prevDay = base.subtract(1, "day").format("YYYY-MM-DD");
  const nextDay = base.add(1, "day").format("YYYY-MM-DD");
  const month = base.format("YYYY-MM");

  let workouts: DbRecord<WorkoutFields>[] = [];
  let error: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      workouts = await listWorkoutsByOwnerAndDayKey({ ownerKey, dayKey });
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const rightSlot = (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Link href={`/workout?day=${prevDay}`}>←</Link>
      <Link href={`/home?month=${month}`}>ホーム</Link>
      <Link href={`/workout?day=${nextDay}`}>→</Link>
    </div>
  );

  async function onDeleteWorkout(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await deleteWorkout({ id });
  }

  return (
    <AppShell title="ワークアウト" rightSlot={rightSlot}>
      {!isDatabaseConfigured() ? (
        <Card glass style={{ padding: 12 }}>
          <div style={{ fontWeight: 900 }}>Postgres が未設定です</div>
          <p className="cb-muted" style={{ margin: "8px 0 0" }}>{databaseConfigHint()}</p>
        </Card>
      ) : null}

      {error ? (
        <Card glass style={{ padding: 12, border: "1px solid rgba(190, 82, 242, 0.6)" }}>
          <div style={{ fontWeight: 900 }}>読み込みエラー</div>
          <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{error}</pre>
        </Card>
      ) : null}

      <WorkoutForm dayKey={dayKey} disabled={!isDatabaseConfigured() || Boolean(error)} />

      <Card glass style={{ padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>ワークアウトの記録</div>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {workouts.map((w) => {
            const f = w.fields;
            return (
              <li key={w.id} style={{ padding: 12, border: "1px solid var(--card-border)", borderRadius: "var(--radius)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>{f.workoutType}</div>
                  <div className="cb-muted" style={{ fontSize: 12 }}>{f.performedAt}</div>
                </div>

                <div className="cb-muted" style={{ marginTop: 6, fontSize: 12 }}>
                  {f.durationMin} min{f.intensity ? ` / ${f.intensity}` : ""}
                </div>

                {f.detail ? <div style={{ marginTop: 8 }}>{f.detail}</div> : null}

                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <form action={onDeleteWorkout}>
                    <input type="hidden" name="id" value={w.id} />
                    <button
                      type="submit"
                      style={{
                        minHeight: "var(--tap)",
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--card-border)",
                        padding: "10px 14px",
                        background: "transparent",
                        color: "var(--fg)",
                        fontWeight: 700,
                      }}
                      disabled={!isDatabaseConfigured() || Boolean(error)}
                    >
                      削除
                    </button>
                  </form>
                </div>
              </li>
            );
          })}

          {isDatabaseConfigured() && !error && workouts.length === 0 ? (
            <li className="cb-muted" style={{ padding: 8 }}>この日の記録はありません。</li>
          ) : null}
        </ul>
      </Card>
    </AppShell>
  );
}