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

  const dow = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <Card glass style={{ padding: 12 }}>
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(52px, 1fr))",
            gap: 8,
            minWidth: 364,
          }}
        >
          {dow.map((d) => (
            <div key={d} className="cb-muted" style={{ fontSize: 12, textAlign: "center" }}>
              {d}
            </div>
          ))}

          {weeks.flat().map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} style={{ height: 86 }} />;
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
                href={`/daysummary?day=${cell.dayKey}`}
                style={{
                  height: 86,
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--card-border)",
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{dayNum}</span>
                </div>

                {hasAny ? (
                  <span
                    aria-label="この日に記録があります"
                    style={{
                      position: "absolute",
                      bottom: 12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "#8B5A2B",
                      boxShadow: "0 0 0 4px rgba(139, 90, 43, 0.12)",
                    }}
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      <p className="cb-muted" style={{ margin: "10px 2px 0", fontSize: 12 }}>
        ヒント：日付をタップすると該当日のサマリページが開きます。カテゴリごとの編集は左のメニューから移動してください。
      </p>
    </Card>
  );
}
