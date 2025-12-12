"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { saveSleep, deleteSleep } from "@/app/(app)/sleep/actions";
import { Card } from "@/components/Card";

type Props = {
  dayKey: string; // wake-up day
  initial?: {
    sleepStartAt?: string; // ISO
    sleepEndAt?: string; // ISO
    quality?: string;
    note?: string;
  };
  hasExisting: boolean;
  disabled?: boolean;
};

type FormValues = {
  sleepStartAtLocal: string;
  sleepEndAtLocal: string;
  quality: string;
  note: string;
};

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInputValue(v: string): string {
  return new Date(v).toISOString();
}

export function SleepForm({ dayKey, initial, hasExisting, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const defaults = useMemo<FormValues>(() => {
    const now = new Date();
    const endIso = initial?.sleepEndAt ?? now.toISOString();
    const startIso = initial?.sleepStartAt ?? new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(); // default -7h
    return {
      sleepStartAtLocal: toLocalInputValue(startIso),
      sleepEndAtLocal: toLocalInputValue(endIso),
      quality: initial?.quality ?? "",
      note: initial?.note ?? "",
    };
  }, [initial]);

  const { register, handleSubmit, formState } = useForm<FormValues>({ defaultValues: defaults });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: "var(--tap)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--card-border)",
    padding: "10px 12px",
    background: "transparent",
    color: "var(--fg)",
  };

  const btnPrimary: React.CSSProperties = {
    minHeight: "var(--tap)",
    borderRadius: "var(--radius)",
    border: "1px solid transparent",
    padding: "10px 14px",
    background: "var(--c-primary)",
    color: "white",
    fontWeight: 800,
  };

  const btnGhost: React.CSSProperties = {
    minHeight: "var(--tap)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--card-border)",
    padding: "10px 14px",
    background: "transparent",
    color: "var(--fg)",
    fontWeight: 700,
  };

  const onSubmit = handleSubmit((v) => {
    setMsg(null);
    startTransition(async () => {
      const sleepStartAt = fromLocalInputValue(v.sleepStartAtLocal);
      const sleepEndAt = fromLocalInputValue(v.sleepEndAtLocal);

      const res = await saveSleep({
        dayKey,
        sleepStartAt,
        sleepEndAt,
        quality: v.quality.trim().length ? v.quality : undefined,
        note: v.note.trim().length ? v.note : undefined,
      });

      if (!res.ok) {
        setMsg(res.error);
        return;
      }

      setMsg(`保存しました（${res.data.durationMin} 分）`);
      router.refresh();
    });
  });

  const onDelete = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await deleteSleep({ dayKey });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg("削除しました");
      router.refresh();
    });
  };

  return (
    <Card glass style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>今日の記録</div>
          <div className="cb-muted" style={{ fontSize: 12 }}>{dayKey}（起床日）</div>
        </div>
        {msg ? <div className="cb-muted" style={{ fontSize: 12, textAlign: "right" }}>{msg}</div> : null}
      </div>

      <form onSubmit={onSubmit} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>就寝時刻</span>
          <input type="datetime-local" {...register("sleepStartAtLocal", { required: true })} style={inputStyle} disabled={disabled || pending} />
          {formState.errors.sleepStartAtLocal ? <span style={{ fontSize: 12, color: "var(--c-secondary)" }}>必須項目です</span> : null}
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>起床時刻</span>
          <input type="datetime-local" {...register("sleepEndAtLocal", { required: true })} style={inputStyle} disabled={disabled || pending} />
          {formState.errors.sleepEndAtLocal ? <span style={{ fontSize: 12, color: "var(--c-secondary)" }}>必須項目です</span> : null}
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>睡眠の質（任意）</span>
          <select {...register("quality")} style={inputStyle} disabled={disabled || pending}>
            <option value="">—</option>
            <option value="1">1（悪い）</option>
            <option value="2">2</option>
            <option value="3">3（ふつう）</option>
            <option value="4">4</option>
            <option value="5">5（とても良い）</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>メモ（任意）</span>
          <textarea {...register("note")} rows={3} style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} disabled={disabled || pending} />
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          <button type="submit" style={btnPrimary} disabled={disabled || pending}>
            {pending ? "保存中..." : "保存"}
          </button>

          {hasExisting ? (
            <button type="button" style={btnGhost} onClick={onDelete} disabled={disabled || pending}>
              {pending ? "..." : "削除"}
            </button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}