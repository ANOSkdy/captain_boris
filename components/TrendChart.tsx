"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export type TrendPoint = {
  x: string; // label (e.g., dayKey)
  y: number; // value
};

type Props = {
  title?: string;
  unit?: string;
  height?: number;
  data: TrendPoint[];
};

function fmtX(x: string): string {
  // dayKey -> DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x.slice(-2);
  return x;
}

export function TrendChart({ title, unit, height = 220, data }: Props) {
  const safe = (data ?? []).filter((p) => Number.isFinite(p.y));

  return (
    <div style={{ width: "100%", height }}>
      {title ? <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div> : null}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={safe} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" tickFormatter={fmtX} />
          <YAxis tickFormatter={(v) => (unit ? `${v}${unit}` : String(v))} width={42} />
          <Tooltip formatter={(v: any) => (unit ? `${v}${unit}` : v)} labelFormatter={(l) => `Day ${l}`} />
          <Line type="monotone" dataKey="y" stroke="var(--c-primary)" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}