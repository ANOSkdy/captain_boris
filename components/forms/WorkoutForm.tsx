"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { addWorkout } from "@/app/(app)/workout/actions";
import { aiAssistWorkout } from "@/app/(app)/workout/ai-actions";
import { Card } from "@/components/Card";

type Props = {
  dayKey: string;
  disabled?: boolean;
};

type FormValues = {
  performedAtLocal: string;
  workoutType: string;
  durationMin: string;
  intensity: string;
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
  const [aiPending, startAi] = useTransition();

  const [msg, setMsg] = useState<string | null>(null);
  const [aiAssisted, setAiAssisted] = useState<boolean>(false);

  const defaults = useMemo<FormValues>(() => {
    const now = new Date().toISOString();
    return {
      performedAtLocal: toLocalInputValue(now),
      workoutType: "Walk",
      durationMin: "30",
      intensity: "",
      detail: "",
    };
  }, []);

  const { register, handleSubmit, reset, getValues, setValue, formState } = useForm<FormValues>({
    defaultValues: defaults,
  });

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
    fontWeight: 800,
  };

  const onAiAssist = () => {
    setMsg(null);

    const detail = (getValues("detail") ?? "").trim();
    const workoutType = (getValues("workoutType") ?? "").trim();
    const durationMin = (getValues("durationMin") ?? "").trim();
    const intensity = (getValues("intensity") ?? "").trim();

    const text = [detail, workoutType, durationMin ? `${durationMin} min` : "", intensity].filter(Boolean).join(" / ").trim();

    if (!text) {
      setMsg("Detail is empty.");
      return;
    }

    startAi(async () => {
      const res = await aiAssistWorkout({ text });
      if (!res.ok) {
        setMsg(`AI failed: ${res.error}`);
        return;
      }

      if (res.data.workoutType) setValue("workoutType", res.data.workoutType);
      if (typeof res.data.durationMin === "number") setValue("durationMin", String(res.data.durationMin));
      if (res.data.intensity) setValue("intensity", res.data.intensity);

      // Only overwrite detail if AI provides something meaningful OR detail is empty
      const currentDetail = (getValues("detail") ?? "").trim();
      if (res.data.detail && (!currentDetail || res.data.detail.length > currentDetail.length)) {
        setValue("detail", res.data.detail);
      }

      setAiAssisted(true);
      setMsg("AI structured ✅");
    });
  };

  const onSubmit = handleSubmit((v) => {
    setMsg(null);

    startSave(async () => {
      const performedAt = fromLocalInputValue(v.performedAtLocal);
      const durationMin = Number(v.durationMin);

      const res = await addWorkout({
        dayKey,
        performedAt,
        workoutType: v.workoutType,
        durationMin,
        intensity: v.intensity.trim().length ? v.intensity : undefined,
        detail: v.detail.trim().length ? v.detail : undefined,
        aiAssisted: aiAssisted ? true : undefined,
      });

      if (!res.ok) {
        setMsg(res.error);
        return;
      }

      setMsg("Added ✅");
      setAiAssisted(false);
      reset({ ...defaults, performedAtLocal: toLocalInputValue(new Date().toISOString()) });
      router.refresh();
    });
  });

  return (
    <Card glass style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>Add workout</div>
          <div className="cb-muted" style={{ fontSize: 12 }}>{dayKey}</div>
        </div>
        {msg ? <div className="cb-muted" style={{ fontSize: 12, textAlign: "right" }}>{msg}</div> : null}
      </div>

      <form onSubmit={onSubmit} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>Time</span>
          <input type="datetime-local" {...register("performedAtLocal")} style={inputStyle} disabled={disabled || savePending} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>Type</span>
          <select {...register("workoutType")} style={inputStyle} disabled={disabled || savePending}>
            <option value="Walk">Walk</option>
            <option value="Run">Run</option>
            <option value="Gym">Gym</option>
            <option value="Yoga">Yoga</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>Duration (min)</span>
          <input
            inputMode="numeric"
            type="number"
            step="1"
            {...register("durationMin", { required: true })}
            style={inputStyle}
            disabled={disabled || savePending}
          />
          {formState.errors.durationMin ? <span style={{ fontSize: 12, color: "var(--c-secondary)" }}>Required</span> : null}
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>Intensity (optional)</span>
          <select {...register("intensity")} style={inputStyle} disabled={disabled || savePending}>
            <option value="">—</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span className="cb-muted" style={{ fontSize: 12 }}>Detail (optional)</span>
            <button
              type="button"
              style={btnGhost}
              onClick={onAiAssist}
              disabled={disabled || savePending || aiPending}
              aria-label="AI assist"
            >
              {aiPending ? "AI..." : "AI Assist"}
            </button>
          </div>
          <textarea {...register("detail")} rows={2} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} disabled={disabled || savePending} />
          {aiAssisted ? <span className="cb-muted" style={{ fontSize: 12 }}>AI assisted ✓</span> : null}
        </label>

        <button type="submit" style={btnPrimary} disabled={disabled || savePending}>
          {savePending ? "Adding..." : "Add"}
        </button>
      </form>
    </Card>
  );
}