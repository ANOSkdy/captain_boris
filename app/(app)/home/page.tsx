import "server-only";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { MonthCalendar, type MonthCalendarDayMeta } from "@/components/MonthCalendar";
import type { DbRecord } from "@/lib/db/types";
import type { DaysFields } from "@/lib/db/repositories/daysRepo";
import { listDaysByDateRange } from "@/lib/db/repositories/daysRepo";
import { isDatabaseConfigured, databaseConfigHint } from "@/lib/db/isConfigured";
import { getAppTz, getOwnerKey } from "@/lib/actions/common";

dayjs.extend(utc);
dayjs.extend(timezone);

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pickParam(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function normalizeMonth(input: string | undefined, tz: string): string {
  if (input && /^\d{4}-\d{2}$/.test(input)) return input;
  return dayjs().tz(tz).format("YYYY-MM");
}

function toMeta(records: DbRecord<DaysFields>[]): MonthCalendarDayMeta[] {
  return records.map((r) => ({
    dayKey: r.fields.dayKey,
    weightCount: r.fields.weightCount ?? 0,
    sleepCount: r.fields.sleepCount ?? 0,
    mealCount: r.fields.mealCount ?? 0,
    workoutCount: r.fields.workoutCount ?? 0,
  }));
}

export default async function HomePage({ searchParams }: { searchParams?: SearchParams }) {
  const tz = getAppTz();
  const ownerKey = getOwnerKey();

  const monthParam = pickParam(searchParams?.month);
  const month = normalizeMonth(monthParam, tz);

  const start = dayjs.tz(`${month}-01`, tz).startOf("month");
  const end = start.add(1, "month");
  const prevMonth = start.subtract(1, "month").format("YYYY-MM");
  const nextMonth = start.add(1, "month").format("YYYY-MM");

  let days: DbRecord<DaysFields>[] = [];
  let error: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      days = await listDaysByDateRange({
        ownerKey,
        startInclusive: start.format("YYYY-MM-DD"),
        endExclusive: end.format("YYYY-MM-DD"),
      });
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const rightSlot = (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Link href={`/home?month=${prevMonth}`}>←</Link>
      <span className="cb-muted" style={{ fontSize: 12 }}>{month}</span>
      <Link href={`/home?month=${nextMonth}`}>→</Link>
    </div>
  );

  return (
    <AppShell title="ホーム" rightSlot={rightSlot}>
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

      <MonthCalendar month={month} tz={tz} days={toMeta(days)} />
    </AppShell>
  );
}