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
import { getOwnerKey } from "@/lib/actions/common";

dayjs.extend(utc);
dayjs.extend(timezone);

export const dynamic = "force-dynamic";
export const revalidate = 0;

dayjs.tz.setDefault("Asia/Tokyo");

type WorkoutGroup = {
  dayKey: string;
  items: DbRecord<WorkoutFields>[];
};

const DISPLAY_TZ = "Asia/Tokyo";

function fmtDateTime(iso: string, tz: string): string {
  return dayjs.utc(iso).tz(tz).format("YYYY-MM-DD HH:mm [JST]");
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

function WorkoutRow({
  record,
  tz,
  compact = false,
}: {
  record: DbRecord<WorkoutFields>;
  tz: string;
  compact?: boolean;
}) {
  const f = record.fields;

  return (
    <div className={`workout-list__row${compact ? " workout-list__row--compact" : ""}`}>
      <div className="workout-list__cell" data-label="日時">
        <span>{fmtDateTime(f.performedAt, tz)}</span>
      </div>
      <div className="workout-list__cell" data-label="種類">
        <span style={{ fontWeight: 700 }}>{f.workoutType}</span>
      </div>
      <div className="workout-list__cell" data-label="メニュー">
        <span className={compact ? "workout-list__truncate" : undefined} style={{ whiteSpace: compact ? "nowrap" : "pre-wrap" }}>
          {f.detail ?? "—"}
        </span>
      </div>
      <div className="workout-list__cell" data-label="重さ（kg）">
        <span>{f.durationMin ?? "—"}</span>
      </div>
      <div className="workout-list__cell" data-label="回数">
        <span>{f.intensity ?? "—"}</span>
      </div>
    </div>
  );
}

export default async function WorkoutListPage() {
  const tz = DISPLAY_TZ;
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
            <div>種類</div>
            <div>メニュー</div>
            <div>重さ（kg）</div>
            <div>回数</div>
          </div>
          {group.items.length > 0 ? (
            <div className="workout-list__rows">
              <WorkoutRow record={group.items[0]} tz={tz} compact />
            </div>
          ) : null}

          {group.items.length > 1 ? (
            <details className="workout-list__more">
              <summary className="workout-list__toggle">
                他{group.items.length - 1}件を表示
                <span aria-hidden="true" style={{ fontSize: 12, color: "var(--muted)" }}>
                  ▼
                </span>
              </summary>
              <div className="workout-list__rows">
                {group.items.slice(1).map((record) => (
                  <WorkoutRow key={record.id} record={record} tz={tz} />
                ))}
              </div>
            </details>
          ) : null}
        </Card>
      ))}
    </AppShell>
  );
}
