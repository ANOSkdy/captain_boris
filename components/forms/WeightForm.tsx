"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { saveWeight, deleteWeight } from "@/app/(app)/weight/actions";
import { Card } from "@/components/Card";

type Props = {
  dayKey: string;
  initial?: {
    weightKg?: number;
    bodyFatPct?: number;
    note?: string;
    recordedAt?: string; // ISO
  };
  hasExisting: boolean;
  disabled?: boolean;
};

type FormValues = {
  recordedAtLocal: string;
  weightKg: string;
  bodyFatPct: string;
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

export function WeightForm({ dayKey, initial, hasExisting, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const defaults = useMemo<FormValues>(() => {
    const now = new Date().toISOString();
    return {
      recordedAtLocal: toLocalInputValue(initial?.recordedAt ?? now),
      weightKg: initial?.weightKg != null ? String(initial.weightKg) : "",
      bodyFatPct: initial?.bodyFatPct != null ? String(initial.bodyFatPct) : "",
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
      const weightKg = Number(v.weightKg);
      const bodyFatPct = v.bodyFatPct.trim().length ? Number(v.bodyFatPct) : undefined;
      const recordedAt = fromLocalInputValue(v.recordedAtLocal);

      const res = await saveWeight({
        dayKey,
        recordedAt,
        weightKg,
        bodyFatPct,
        note: v.note.trim().length ? v.note : undefined,
      });

      if (!res.ok) {
        setMsg(res.error);
        return;
      }

      setMsg(res.data.mode === "created" ? "Saved (created)" : "Saved (updated)");
      router.refresh();
    });
  });

  const onDelete = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await deleteWeight({ dayKey });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg("Deleted");
      router.refresh();
    });
  };

  return (
    <Card glass style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>Today</div>
          <div className="cb-muted" style={{ fontSize: 12 }}>{dayKey}</div>
        </div>
        {msg ? <div className="cb-muted" style={{ fontSize: 12, textAlign: "right" }}>{msg}</div> : null}
      </div>

      <form onSubmit={onSubmit} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>Recorded at</span>
          <input type="datetime-local" {...register("recordedAtLocal")} style={inputStyle} disabled={disabled || pending} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>Weight (kg)</span>
          <input
            inputMode="decimal"
            step="0.1"
            type="number"
            {...register("weightKg", { required: true })}
            style={inputStyle}
            disabled={disabled || pending}
          />
          {formState.errors.weightKg ? <span style={{ fontSize: 12, color: "var(--c-secondary)" }}>Required</span> : null}
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>Body fat (%) (optional)</span>
          <input inputMode="decimal" step="0.1" type="number" {...register("bodyFatPct")} style={inputStyle} disabled={disabled || pending} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>Note (optional)</span>
          <textarea {...register("note")} rows={3} style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} disabled={disabled || pending} />
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          <button type="submit" style={btnPrimary} disabled={disabled || pending}>
            {pending ? "Saving..." : "Save"}
          </button>

          {hasExisting ? (
            <button type="button" style={btnGhost} onClick={onDelete} disabled={disabled || pending}>
              {pending ? "..." : "Delete"}
            </button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}