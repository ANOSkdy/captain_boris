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

type WorkoutGroup = {
  dayKey: string;
  items: DbRecord<WorkoutFields>[];
};

type SearchParams = Record<string, string | string[] | undefined>;

const DISPLAY_TZ = "Asia/Tokyo";

function fmtDateTime(iso: string, tz: string): string {
  return dayjs.tz(iso, tz).format("YYYY-MM-DD HH:mm [JST]");
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

function pickParam(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function normalizeFilterValue(v: string | undefined): string {
  return v?.trim().toLowerCase() ?? "";
}

function filterWorkouts(records: DbRecord<WorkoutFields>[], filterType: string, filterMenu: string) {
  if (!filterType && !filterMenu) return records;

  return records.filter((record) => {
    const type = normalizeFilterValue(record.fields.workoutType);
    const detail = normalizeFilterValue(record.fields.detail);

    const matchesType = filterType ? type === filterType : true;
    const matchesMenu = filterMenu ? detail.includes(filterMenu) : true;

    return matchesType && matchesMenu;
  });
}

function toWorkoutTypes(records: DbRecord<WorkoutFields>[]): string[] {
  return Array.from(new Set(records.map((r) => r.fields.workoutType))).filter(Boolean).sort();
}

export default async function WorkoutListPage({ searchParams }: { searchParams?: SearchParams }) {
  const tz = DISPLAY_TZ;
  const ownerKey = getOwnerKey();
  const typeFilterInput = pickParam(searchParams?.type) ?? "";
  const menuFilterInput = pickParam(searchParams?.menu) ?? "";
  const typeFilter = normalizeFilterValue(typeFilterInput);
  const menuFilter = normalizeFilterValue(menuFilterInput);

  let workouts: DbRecord<WorkoutFields>[] = [];
  let error: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      workouts = await listWorkoutsByOwner(ownerKey);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const availableTypes = toWorkoutTypes(workouts);
  const filteredWorkouts = filterWorkouts(workouts, typeFilter, menuFilter);
  const groups = groupByDay(filteredWorkouts);

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

      <Card glass style={{ padding: 12, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>フィルター</div>
        <form method="get" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="cb-muted" style={{ fontSize: 12 }}>種類</span>
              <select
                name="type"
                defaultValue={typeFilterInput}
                style={{
                  minHeight: "var(--tap)",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--card-border)",
                  padding: "10px 12px",
                  background: "transparent",
                  color: "var(--fg)",
                }}
              >
                <option value="">すべて</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span className="cb-muted" style={{ fontSize: 12 }}>メニュー</span>
              <input
                name="menu"
                defaultValue={menuFilterInput}
                placeholder="キーワードで絞り込み"
                style={{
                  width: "100%",
                  minHeight: "var(--tap)",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--card-border)",
                  padding: "10px 12px",
                  background: "transparent",
                  color: "var(--fg)",
                }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="submit"
              style={{
                minHeight: "var(--tap)",
                borderRadius: "var(--radius)",
                border: "1px solid transparent",
                padding: "10px 14px",
                background: "var(--c-primary)",
                color: "white",
                fontWeight: 800,
              }}
            >
              絞り込む
            </button>

            {(typeFilter || menuFilter) && (
              <a
                href="/workoutlist"
                style={{
                  minHeight: "var(--tap)",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--card-border)",
                  padding: "10px 14px",
                  color: "var(--fg)",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                条件をクリア
              </a>
            )}
          </div>
        </form>

        {(typeFilter || menuFilter) && (
          <div className="cb-muted" style={{ fontSize: 12 }}>
            表示中: 種類 {typeFilter ? `「${typeFilter}」` : "指定なし"} / メニュー {menuFilter ? `「${menuFilter}」` : "指定なし"}
          </div>
        )}
      </Card>

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
          <div className="workout-list__rows">
            {group.items.map((record) => {
              const f = record.fields;
              return (
                <div key={record.id} className="workout-list__row">
                  <div className="workout-list__cell" data-label="日時">
                    <span>{fmtDateTime(f.performedAt, tz)}</span>
                  </div>
                  <div className="workout-list__cell" data-label="種類">
                    <span style={{ fontWeight: 700 }}>{f.workoutType}</span>
                  </div>
                  <div className="workout-list__cell" data-label="メニュー">
                    <span style={{ whiteSpace: "pre-wrap" }}>{f.detail ?? "—"}</span>
                  </div>
                  <div className="workout-list__cell" data-label="重さ（kg）">
                    <span>{f.durationMin ?? "—"}</span>
                  </div>
                  <div className="workout-list__cell" data-label="回数">
                    <span>{f.intensity ?? "—"}</span>
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
