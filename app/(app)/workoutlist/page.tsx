import "server-only";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Link from "next/link";

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

  const rightSlot = (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Link href="/home">ホーム</Link>
    </div>
  );

  return (
    <AppShell title="ワークアウト履歴" rightSlot={rightSlot}>
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
          <div
            className="cb-muted"
            style={{
              display: "grid",
              gridTemplateColumns: "140px 90px minmax(90px, 1fr) minmax(160px, 2fr)",
              gap: 8,
              fontSize: 12,
            }}
          >
            <div>日時</div>
            <div>時間（分）</div>
            <div>種類</div>
            <div>詳細</div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {group.items.map((record) => {
              const f = record.fields;
              return (
                <div
                  key={record.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 90px minmax(90px, 1fr) minmax(160px, 2fr)",
                    gap: 8,
                    alignItems: "start",
                  }}
                >
                  <div style={{ fontSize: 13 }}>{fmtDateTime(f.performedAt, tz)}</div>
                  <div style={{ fontSize: 13 }}>{f.durationMin}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{f.workoutType}</div>
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{f.detail ?? "—"}</div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </AppShell>
  );
}
