import "server-only";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { MealForm } from "@/components/forms/MealForm";

import type { AirtableRecord } from "@/lib/airtable/client";
import type { MealFields } from "@/lib/airtable/repositories/mealRepo";
import { listMealsByOwnerAndDayKey } from "@/lib/airtable/repositories/mealRepo";
import { isAirtableConfigured, airtableConfigHint } from "@/lib/airtable/isConfigured";
import { getAppTz, getOwnerKey } from "@/lib/actions/common";
import { toDayKey } from "@/lib/domain/dayKey";

import { deleteMeal } from "@/app/(app)/eat/actions";

dayjs.extend(utc);
dayjs.extend(timezone);

type SearchParams = Record<string, string | string[] | undefined>;

function pickParam(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function normalizeDay(input: string | undefined, tz: string): string {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  return toDayKey(new Date(), tz);
}

export default async function EatPage({ searchParams }: { searchParams?: SearchParams }) {
  const tz = getAppTz();
  const ownerKey = getOwnerKey();
  const dayKey = normalizeDay(pickParam(searchParams?.day), tz);

  const base = dayjs.tz(dayKey, tz);
  const prevDay = base.subtract(1, "day").format("YYYY-MM-DD");
  const nextDay = base.add(1, "day").format("YYYY-MM-DD");
  const month = base.format("YYYY-MM");

  let meals: AirtableRecord<MealFields>[] = [];
  let error: string | null = null;

  if (isAirtableConfigured()) {
    try {
      meals = await listMealsByOwnerAndDayKey({ ownerKey, dayKey });
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const rightSlot = (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Link href={`/eat?day=${prevDay}`}>←</Link>
      <Link href={`/home?month=${month}`}>Home</Link>
      <Link href={`/eat?day=${nextDay}`}>→</Link>
    </div>
  );

  async function onDeleteMeal(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await deleteMeal({ id });
  }

  return (
    <AppShell title="Eat" rightSlot={rightSlot}>
      {!isAirtableConfigured() ? (
        <Card glass style={{ padding: 12 }}>
          <div style={{ fontWeight: 900 }}>Airtable not configured</div>
          <p className="cb-muted" style={{ margin: "8px 0 0" }}>{airtableConfigHint()}</p>
        </Card>
      ) : null}

      {error ? (
        <Card glass style={{ padding: 12, border: "1px solid rgba(190, 82, 242, 0.6)" }}>
          <div style={{ fontWeight: 900 }}>Load error</div>
          <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{error}</pre>
        </Card>
      ) : null}

      <MealForm dayKey={dayKey} disabled={!isAirtableConfigured() || Boolean(error)} />

      <Card glass style={{ padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Meals</div>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {meals.map((m) => {
            const f = m.fields;
            return (
              <li key={m.id} style={{ padding: 12, border: "1px solid var(--card-border)", borderRadius: "var(--radius)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>{f.mealType}</div>
                  <div className="cb-muted" style={{ fontSize: 12 }}>{f.eatenAt}</div>
                </div>

                <div style={{ marginTop: 8 }}>{f.text}</div>

                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div className="cb-muted" style={{ fontSize: 12 }}>
                    {typeof f.caloriesKcal === "number" ? `${f.caloriesKcal} kcal` : ""}
                  </div>

                  <form action={onDeleteMeal}>
                    <input type="hidden" name="id" value={m.id} />
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
                      disabled={!isAirtableConfigured() || Boolean(error)}
                    >
                      Delete
                    </button>
                  </form>
                </div>

                {f.note ? <div className="cb-muted" style={{ fontSize: 12, marginTop: 8 }}>{f.note}</div> : null}
              </li>
            );
          })}

          {isAirtableConfigured() && !error && meals.length === 0 ? (
            <li className="cb-muted" style={{ padding: 8 }}>No meals for this day.</li>
          ) : null}
        </ul>
      </Card>
    </AppShell>
  );
}