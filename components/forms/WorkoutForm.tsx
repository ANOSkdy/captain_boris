"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { addWorkout } from "@/app/(app)/workout/actions";
import { Card } from "@/components/Card";

type Props = {
  dayKey: string;
  disabled?: boolean;
};

type FormValues = {
  performedAtLocal: string;
  workoutType: string;
  weightKg: string;
  reps: string;
  detail: string;
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

export function WorkoutForm({ dayKey, disabled }: Props) {
  const router = useRouter();

  const [savePending, startSave] = useTransition();

  const [msg, setMsg] = useState<string | null>(null);

  const defaults = useMemo<FormValues>(() => {
    const now = new Date().toISOString();
    return {
      performedAtLocal: toLocalInputValue(now),
      workoutType: "胸",
      weightKg: "0",
      reps: "",
      detail: "",
    };
  }, []);

  const { register, handleSubmit, reset, formState, watch } = useForm<FormValues>({
    defaultValues: defaults,
  });
  const performedAtValue = watch("performedAtLocal");

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

  const onSubmit = handleSubmit((v) => {
    setMsg(null);

    startSave(async () => {
      const performedAt = fromLocalInputValue(v.performedAtLocal);
      const weightKg = Number(v.weightKg);
      const reps = v.reps.trim();

      const res = await addWorkout({
        dayKey,
        performedAt,
        workoutType: v.workoutType,
        durationMin: weightKg,
        intensity: reps.length ? reps : undefined,
        detail: v.detail.trim().length ? v.detail : undefined,
      });

      if (!res.ok) {
        setMsg(res.error);
        return;
      }

      setMsg("追加しました ✅");
      reset({ ...defaults, performedAtLocal: toLocalInputValue(new Date().toISOString()) });
      router.refresh();
    });
  });

  return (
    <Card glass style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>ワークアウトを追加</div>
          <div className="cb-muted" style={{ fontSize: 12 }}>{dayKey}</div>
        </div>
        {msg ? <div className="cb-muted" style={{ fontSize: 12, textAlign: "right" }}>{msg}</div> : null}
      </div>

      <form onSubmit={onSubmit} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>時間</span>
          <input type="hidden" {...register("performedAtLocal")} />
          <input
            type="datetime-local"
            style={{ ...inputStyle, color: "var(--muted)" }}
            value={performedAtValue}
            readOnly
            aria-readonly
            tabIndex={-1}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>種類</span>
          <select {...register("workoutType")} style={inputStyle} disabled={disabled || savePending}>
            <option value="胸">胸</option>
            <option value="背中">背中</option>
            <option value="脚">脚</option>
            <option value="腕">腕</option>
            <option value="肩">肩</option>
            <option value="その他">その他</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>重さ（kg）</span>
          <input
            inputMode="numeric"
            type="number"
            step="1"
            min="0"
            {...register("weightKg", { required: true })}
            style={inputStyle}
            disabled={disabled || savePending}
          />
          {formState.errors.weightKg ? <span style={{ fontSize: 12, color: "var(--c-secondary)" }}>必須項目です</span> : null}
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>回数（任意）</span>
          <input
            inputMode="numeric"
            type="number"
            step="1"
            min="0"
            {...register("reps")}
            style={inputStyle}
            disabled={disabled || savePending}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>詳細（任意）</span>
          <textarea {...register("detail")} rows={2} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} disabled={disabled || savePending} />
        </label>

        <button type="submit" style={btnPrimary} disabled={disabled || savePending}>
          {savePending ? "追加中..." : "追加"}
        </button>
      </form>
    </Card>
  );
}
