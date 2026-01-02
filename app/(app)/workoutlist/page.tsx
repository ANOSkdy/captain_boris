import "server-only";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

import type { DbRecord } from "@/lib/db/types";
import type { WorkoutFields } from "@/lib/db/repositories/workoutRepo";
import { listWorkoutsByOwner } from "@/lib/db/repositories/workoutRepo";
import { isDatabaseConfigured, databaseConfigHint } from "@/lib/db/isConfigured";
import { getAppTz, getOwnerKey } from "@/lib/actions/common";

dayjs.extend(utc);
dayjs.extend(timezone);

export const dynamic = "force-dynamic";

type WorkoutGroup = {
  dayKey: string;
  items: DbRecord<WorkoutFields>[];
};

function fmtDateTime(iso: string, tz: string): string {
  return dayjs.tz(iso, tz).format("YYYY-MM-DD HH:mm");
}

function groupByDay(records: DbRecord<WorkoutFields>[]): WorkoutGroup[] {
  const map = new Map<string, DbRecord<WorkoutFields>[]>();
  records.forEach((record) => {
    const key = record.fields.dayKey;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(record);
  });

  return Array.from(map.entries()).map(([dayKey, items]) => ({ dayKey, items }));
}

export default async function WorkoutListPage() {
  const tz = getAppTz();
  const ownerKey = getOwnerKey();

  let workouts: DbRecord<WorkoutFields>[] = [];
  let error: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      workouts = await listWorkoutsByOwner(ownerKey);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const groups = groupByDay(workouts);

  return (
    <AppShell title="ワークアウト履歴">
      {!isDatabaseConfigured() ? (
        <Card glass style={{ padding: 12 }}>
          <div style={{ fontWeight: 900 }}>Postgres が未設定です</div>
          <p className="cb-muted" style={{ margin: "8px 0 0" }}>{databaseConfigHint()}</p>
          <p style={{ margin: "8px 0 0" }}>
            <code>.env.local</code> に値を設定して開発サーバーを再起動してください。
          </p>
        </Card>
      ) : null}

      {error ? (
        <Card glass style={{ padding: 12, border: "1px solid rgba(190, 82, 242, 0.6)" }}>
          <div style={{ fontWeight: 900 }}>読み込みエラー</div>
          <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{error}</pre>
        </Card>
      ) : null}

      {isDatabaseConfigured() && !error && groups.length === 0 ? (
        <Card glass style={{ padding: 12 }}>
          <div className="cb-muted">ワークアウト履歴はまだありません。</div>
        </Card>
      ) : null}

      {groups.map((group) => (
        <Card key={group.dayKey} glass style={{ padding: 12, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>{group.dayKey}</div>
          <div className="workout-list__header cb-muted">
            <div>日時</div>
            <div>重さ（kg）</div>
            <div>種類</div>
            <div>詳細</div>
          </div>
          <div className="workout-list__rows">
            {group.items.map((record) => {
              const f = record.fields;
              return (
                <div key={record.id} className="workout-list__row">
                  <div className="workout-list__cell" data-label="日時">
                    <span>{fmtDateTime(f.performedAt, tz)}</span>
                  </div>
                  <div className="workout-list__cell" data-label="重さ（kg）">
                    <span>{f.durationMin}</span>
                  </div>
                  <div className="workout-list__cell" data-label="種類">
                    <span style={{ fontWeight: 700 }}>{f.workoutType}</span>
                  </div>
                  <div className="workout-list__cell" data-label="詳細">
                    <span style={{ whiteSpace: "pre-wrap" }}>{f.detail ?? "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </AppShell>
  );
}
