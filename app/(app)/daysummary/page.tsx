import "server-only";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

import type { DbRecord } from "@/lib/db/types";
import type { WeightFields } from "@/lib/db/repositories/weightRepo";
import type { SleepFields } from "@/lib/db/repositories/sleepRepo";
import type { MealFields } from "@/lib/db/repositories/mealRepo";
import { findWeightByOwnerAndDayKey } from "@/lib/db/repositories/weightRepo";
import { findSleepByOwnerAndDayKey } from "@/lib/db/repositories/sleepRepo";
import { listMealsByOwnerAndDayKey } from "@/lib/db/repositories/mealRepo";
import { isDatabaseConfigured, databaseConfigHint } from "@/lib/db/isConfigured";
import { getAppTz, getOwnerKey } from "@/lib/actions/common";
import { toDayKey } from "@/lib/domain/dayKey";

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

function fmtHhMm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}時間 ${m}分`;
}

function fmtTime(iso: string, tz: string): string {
  return dayjs.tz(iso, tz).format("HH:mm");
}

function fmtDateTime(iso: string, tz: string): string {
  return dayjs.tz(iso, tz).format("YYYY-MM-DD HH:mm");
}

export default async function DaySummaryPage({ searchParams }: { searchParams?: SearchParams }) {
  const tz = getAppTz();
  const ownerKey = getOwnerKey();
  const dayKey = normalizeDay(pickParam(searchParams?.day), tz);

  const base = dayjs.tz(dayKey, tz);
  const prevDay = base.subtract(1, "day").format("YYYY-MM-DD");
  const nextDay = base.add(1, "day").format("YYYY-MM-DD");

  let weight: DbRecord<WeightFields> | null = null;
  let sleep: DbRecord<SleepFields> | null = null;
  let meals: DbRecord<MealFields>[] = [];
  let error: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      const [w, s, m] = await Promise.all([
        findWeightByOwnerAndDayKey(ownerKey, dayKey),
        findSleepByOwnerAndDayKey(ownerKey, dayKey),
        listMealsByOwnerAndDayKey(ownerKey, dayKey),
      ]);
      weight = w;
      sleep = s;
      meals = m;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const totalCalories = meals.reduce((sum, meal) => sum + (meal.fields.caloriesKcal ?? 0), 0);

  const rightSlot = (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Link href={`/daysummary?day=${prevDay}`}>←</Link>
      <Link href={`/daysummary?day=${nextDay}`}>→</Link>
    </div>
  );

  const workoutListButtonStyle = {
    minHeight: "var(--tap)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--card-border)",
    padding: "10px 14px",
    background: "var(--surface-strong)",
    color: "var(--fg)",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <AppShell title={`${dayKey} のサマリ`} rightSlot={rightSlot}>
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

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link href="/workoutlist" style={workoutListButtonStyle}>
          ワークアウト履歴
        </Link>
      </div>

      <Card glass style={{ padding: 12, display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>体重</div>
        {weight ? (
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>
              {weight.fields.weightKg} kg
              {typeof weight.fields.bodyFatPct === "number" ? (
                <span className="cb-muted" style={{ fontSize: 14, marginLeft: 8 }}>
                  体脂肪 {weight.fields.bodyFatPct}%
                </span>
              ) : null}
            </div>
            <div className="cb-muted" style={{ fontSize: 12, marginTop: 6 }}>
              記録時刻: {fmtDateTime(weight.fields.recordedAt, tz)}
            </div>
            {weight.fields.note ? (
              <div className="cb-muted" style={{ fontSize: 12, marginTop: 6 }}>{weight.fields.note}</div>
            ) : null}
            <div style={{ marginTop: 8 }}>
              <Link className="cb-muted" style={{ fontSize: 12 }} href={`/weight?day=${dayKey}`}>
                体重ページで編集する
              </Link>
            </div>
          </div>
        ) : (
          <div className="cb-muted">この日の体重記録はありません。</div>
        )}
      </Card>

      <Card glass style={{ padding: 12, display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>睡眠</div>
        {sleep ? (
          <div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{fmtHhMm(sleep.fields.durationMin)}</div>
            <div className="cb-muted" style={{ fontSize: 12, marginTop: 6 }}>
              {fmtDateTime(sleep.fields.sleepStartAt, tz)} → {fmtDateTime(sleep.fields.sleepEndAt, tz)}
            </div>
            {sleep.fields.quality ? (
              <div style={{ marginTop: 6 }}>
                <span className="cb-muted" style={{ fontSize: 12 }}>質: {sleep.fields.quality}</span>
              </div>
            ) : null}
            {sleep.fields.note ? (
              <div className="cb-muted" style={{ fontSize: 12, marginTop: 6 }}>{sleep.fields.note}</div>
            ) : null}
            <div style={{ marginTop: 8 }}>
              <Link className="cb-muted" style={{ fontSize: 12 }} href={`/sleep?day=${dayKey}`}>
                睡眠ページで編集する
              </Link>
            </div>
          </div>
        ) : (
          <div className="cb-muted">この日の睡眠記録はありません。</div>
        )}
      </Card>

      <Card glass style={{ padding: 12, display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 900, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span>食事</span>
          {meals.length ? <span className="cb-muted" style={{ fontSize: 12 }}>合計 {meals.length} 件</span> : null}
        </div>

        {meals.length ? (
          <>
            {totalCalories > 0 ? (
              <div className="cb-muted" style={{ fontSize: 12 }}>概算カロリー: {totalCalories} kcal</div>
            ) : null}

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {meals.map((meal) => (
                <li
                  key={meal.id}
                  style={{ padding: 12, border: "1px solid var(--card-border)", borderRadius: "var(--radius)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                    <div style={{ fontWeight: 800 }}>{meal.fields.mealType}</div>
                    <div className="cb-muted" style={{ fontSize: 12 }}>
                      {fmtTime(meal.fields.eatenAt, tz)}
                    </div>
                  </div>
                  <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{meal.fields.text}</div>
                  {typeof meal.fields.caloriesKcal === "number" ? (
                    <div className="cb-muted" style={{ fontSize: 12, marginTop: 6 }}>
                      {meal.fields.caloriesKcal} kcal
                    </div>
                  ) : null}
                  {meal.fields.note ? (
                    <div className="cb-muted" style={{ fontSize: 12, marginTop: 6 }}>{meal.fields.note}</div>
                  ) : null}
                </li>
              ))}
            </ul>

            <div style={{ marginTop: 4 }}>
              <Link className="cb-muted" style={{ fontSize: 12 }} href={`/eat?day=${dayKey}`}>
                食事ページで編集する
              </Link>
            </div>
          </>
        ) : (
          <div className="cb-muted">この日の食事記録はありません。</div>
        )}
      </Card>

    </AppShell>
  );
}
