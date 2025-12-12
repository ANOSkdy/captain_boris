import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Link from "next/link";

import { Card } from "./Card";

dayjs.extend(utc);
dayjs.extend(timezone);

export type MonthCalendarDayMeta = {
  dayKey: string; // YYYY-MM-DD
  weightCount?: number;
  sleepCount?: number;
  mealCount?: number;
  workoutCount?: number;
};

type Props = {
  month: string; // YYYY-MM
  tz: string;
  days: MonthCalendarDayMeta[]; // sparse
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function buildDayKey(month: string, day: number): string {
  return `${month}-${pad2(day)}`;
}

function badge(text: string) {
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 6px",
        borderRadius: 999,
        border: "1px solid var(--card-border)",
        background: "rgba(105, 121, 248, 0.10)",
        lineHeight: 1.2,
      }}
    >
      {text}
    </span>
  );
}

export function MonthCalendar({ month, tz, days }: Props) {
  const first = dayjs.tz(`${month}-01`, tz);
  const daysInMonth = first.daysInMonth();
  const startDow = first.day(); // 0 Sun ... 6 Sat

  const map = new Map<string, MonthCalendarDayMeta>();
  for (const d of days) map.set(d.dayKey, d);

  const weeks: Array<Array<MonthCalendarDayMeta | null>> = [];
  let currentWeek: Array<MonthCalendarDayMeta | null> = [];

  for (let i = 0; i < startDow; i++) currentWeek.push(null);

  for (let day = 1; day <= daysInMonth; day++) {
    const dayKey = buildDayKey(month, day);
    const meta = map.get(dayKey) ?? { dayKey, weightCount: 0, sleepCount: 0, mealCount: 0, workoutCount: 0 };
    currentWeek.push(meta);

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card glass style={{ padding: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {dow.map((d) => (
          <div key={d} className="cb-muted" style={{ fontSize: 12, textAlign: "center" }}>
            {d}
          </div>
        ))}

        {weeks.flat().map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} style={{ height: 78 }} />;
          }

          const dayNum = Number(cell.dayKey.slice(-2));
          const w = cell.weightCount ?? 0;
          const s = cell.sleepCount ?? 0;
          const m = cell.mealCount ?? 0;
          const wo = cell.workoutCount ?? 0;
          const hasAny = (w + s + m + wo) > 0;

          return (
            <Link
              key={cell.dayKey}
              href={`/eat?day=${cell.dayKey}`}
              style={{
                height: 78,
                borderRadius: "var(--radius)",
                border: "1px solid var(--card-border)",
                background: hasAny ? "rgba(0, 198, 255, 0.10)" : "transparent",
                padding: 8,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 800 }}>{dayNum}</span>
                {hasAny ? <span className="cb-muted" style={{ fontSize: 10 }}>•</span> : null}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {w > 0 ? badge(`W${w}`) : null}
                {s > 0 ? badge(`S${s}`) : null}
                {m > 0 ? badge(`M${m}`) : null}
                {wo > 0 ? badge(`WO${wo}`) : null}
              </div>
            </Link>
          );
        })}
      </div>

      <p className="cb-muted" style={{ margin: "10px 2px 0", fontSize: 12 }}>
        Tip: Tap a day to open Eat (day detail). Use links on Home for other categories.
      </p>
    </Card>
  );
}
