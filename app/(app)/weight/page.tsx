import "server-only";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { TrendChart, type TrendPoint } from "@/components/TrendChart";
import { WeightForm } from "@/components/forms/WeightForm";

import type { AirtableRecord } from "@/lib/airtable/client";
import type { WeightFields } from "@/lib/airtable/repositories/weightRepo";
import { findWeightByOwnerAndDayKey } from "@/lib/airtable/repositories/weightRepo";
import { isAirtableConfigured, airtableConfigHint } from "@/lib/airtable/isConfigured";
import { getAppTz, getOwnerKey } from "@/lib/actions/common";
import { toDayKey } from "@/lib/domain/dayKey";

dayjs.extend(utc);
dayjs.extend(timezone);

type SearchParams = Record<string, string | string[] | undefined>;
type Item = { dayKey: string; record: AirtableRecord<WeightFields> | null };

function pickParam(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function normalizeDay(input: string | undefined, tz: string): string {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  return toDayKey(new Date(), tz);
}

export default async function WeightPage({ searchParams }: { searchParams?: SearchParams }) {
  const tz = getAppTz();
  const ownerKey = getOwnerKey();
  const baseDay = normalizeDay(pickParam(searchParams?.day), tz);

  const base = dayjs.tz(baseDay, tz);
  const start = base.subtract(13, "day");
  const dayKeys = Array.from({ length: 14 }, (_, i) => start.add(i, "day").format("YYYY-MM-DD"));

  const prevDay = base.subtract(1, "day").format("YYYY-MM-DD");
  const nextDay = base.add(1, "day").format("YYYY-MM-DD");
  const month = base.format("YYYY-MM");

  let items: Item[] = [];
  let error: string | null = null;

  if (isAirtableConfigured()) {
    try {
      const results = await Promise.all(
        dayKeys.map(async (dk) => {
          const record = await findWeightByOwnerAndDayKey(ownerKey, dk);
          return { dayKey: dk, record };
        })
      );
      items = results;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const current = items.find((it) => it.dayKey === baseDay)?.record;
  const points: TrendPoint[] = items
    .filter((it) => typeof it.record?.fields.weightKg === "number")
    .map((it) => ({ x: it.dayKey, y: it.record!.fields.weightKg }));

  const rightSlot = (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Link href={`/weight?day=${prevDay}`}>←</Link>
      <Link href={`/home?month=${month}`}>ホーム</Link>
      <Link href={`/weight?day=${nextDay}`}>→</Link>
    </div>
  );

  return (
    <AppShell title="体重" rightSlot={rightSlot}>
      {!isAirtableConfigured() ? (
        <Card glass style={{ padding: 12 }}>
          <div style={{ fontWeight: 900 }}>Airtable が未設定です</div>
          <p className="cb-muted" style={{ margin: "8px 0 0" }}>{airtableConfigHint()}</p>
        </Card>
      ) : null}

      {error ? (
        <Card glass style={{ padding: 12, border: "1px solid rgba(190, 82, 242, 0.6)" }}>
          <div style={{ fontWeight: 900 }}>読み込みエラー</div>
          <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{error}</pre>
        </Card>
      ) : null}

      <WeightForm
        dayKey={baseDay}
        hasExisting={Boolean(current)}
        initial={
          current
            ? {
                weightKg: current.fields.weightKg,
                bodyFatPct: current.fields.bodyFatPct,
                note: current.fields.note,
                recordedAt: current.fields.recordedAt,
              }
            : undefined
        }
        disabled={!isAirtableConfigured() || Boolean(error)}
      />

      <Card glass style={{ padding: 12 }}>
        <TrendChart title="直近14日間の推移" unit="" data={points} />
      </Card>

      <Card glass style={{ padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>14日分の履歴</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {items.map((it) => {
            const f = it.record?.fields;
            return (
              <li key={it.dayKey} style={{ padding: 12, border: "1px solid var(--card-border)", borderRadius: "var(--radius)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <Link href={`/weight?day=${it.dayKey}`} style={{ fontWeight: 800 }}>{it.dayKey}</Link>
                  <div>{f ? <span>{f.weightKg} kg</span> : <span className="cb-muted">データなし</span>}</div>
                </div>
                {f?.note ? <div className="cb-muted" style={{ fontSize: 12, marginTop: 6 }}>{f.note}</div> : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </AppShell>
  );
}