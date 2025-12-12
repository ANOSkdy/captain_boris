import "server-only";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { MonthCalendar, type MonthCalendarDayMeta } from "@/components/MonthCalendar";
import type { AirtableRecord } from "@/lib/airtable/client";
import type { DaysFields } from "@/lib/airtable/repositories/daysRepo";
import { listDaysByDateRange } from "@/lib/airtable/repositories/daysRepo";
import { isAirtableConfigured, airtableConfigHint } from "@/lib/airtable/isConfigured";
import { getAppTz, getOwnerKey } from "@/lib/actions/common";

dayjs.extend(utc);
dayjs.extend(timezone);

type SearchParams = Record<string, string | string[] | undefined>;

function pickParam(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function normalizeMonth(input: string | undefined, tz: string): string {
  if (input && /^\d{4}-\d{2}$/.test(input)) return input;
  return dayjs().tz(tz).format("YYYY-MM");
}

function toMeta(records: AirtableRecord<DaysFields>[]): MonthCalendarDayMeta[] {
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

  let days: AirtableRecord<DaysFields>[] = [];
  let error: string | null = null;

  if (isAirtableConfigured()) {
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
    <AppShell title="Home" rightSlot={rightSlot}>
      {!isAirtableConfigured() ? (
        <Card glass style={{ padding: 12 }}>
          <div style={{ fontWeight: 900 }}>Airtable not configured</div>
          <p className="cb-muted" style={{ margin: "8px 0 0" }}>{airtableConfigHint()}</p>
          <p style={{ margin: "8px 0 0" }}>
            Set values in <code>.env.local</code> then restart dev server.
          </p>
        </Card>
      ) : null}

      {error ? (
        <Card glass style={{ padding: 12, border: "1px solid rgba(190, 82, 242, 0.6)" }}>
          <div style={{ fontWeight: 900 }}>Load error</div>
          <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{error}</pre>
        </Card>
      ) : null}

      <MonthCalendar month={month} tz={tz} days={toMeta(days)} />

      <Card glass style={{ padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Quick links</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/weight">Weight</Link>
          <Link href="/sleep">Sleep</Link>
          <Link href="/eat">Eat</Link>
          <Link href="/workout">Workout</Link>
        </div>
      </Card>
    </AppShell>
  );
}