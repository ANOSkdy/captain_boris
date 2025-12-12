"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { addMeal } from "@/app/(app)/eat/actions";
import { aiAssistMeal } from "@/app/(app)/eat/ai-actions";
import { Card } from "@/components/Card";

type Props = {
  dayKey: string;
  disabled?: boolean;
};

type FormValues = {
  eatenAtLocal: string;
  mealType: string;
  text: string;
  caloriesKcal: string;
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

function safeJsonPreview(json: string | null): { items: string[]; notes?: string } | null {
  if (!json) return null;
  try {
    const obj = JSON.parse(json);
    const items = Array.isArray(obj.items) ? obj.items.filter((x: any) => typeof x === "string") : [];
    const notes = typeof obj.notes === "string" ? obj.notes : undefined;
    return { items, notes };
  } catch {
    return null;
  }
}

export function MealForm({ dayKey, disabled }: Props) {
  const router = useRouter();

  const [savePending, startSave] = useTransition();
  const [aiPending, startAi] = useTransition();

  const [msg, setMsg] = useState<string | null>(null);
  const [itemsJson, setItemsJson] = useState<string | null>(null);
  const [aiAssisted, setAiAssisted] = useState<boolean>(false);

  const defaults = useMemo<FormValues>(() => {
    const now = new Date().toISOString();
    return {
      eatenAtLocal: toLocalInputValue(now),
      mealType: "Lunch",
      text: "",
      caloriesKcal: "",
      note: "",
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

    const text = (getValues("text") ?? "").trim();
    if (!text) {
      setMsg("Text is empty.");
      return;
    }

    startAi(async () => {
      const res = await aiAssistMeal({ text });
      if (!res.ok) {
        setMsg(`AI failed: ${res.error}`);
        return;
      }

      // Apply best-effort into form
      if (res.data.mealType) setValue("mealType", res.data.mealType);
      if (res.data.notes && !(getValues("note") ?? "").trim()) setValue("note", res.data.notes);

      const json = JSON.stringify(res.data);
      setItemsJson(json);
      setAiAssisted(true);

      setMsg("AI structured ✅");
    });
  };

  const onSubmit = handleSubmit((v) => {
    setMsg(null);

    startSave(async () => {
      const eatenAt = fromLocalInputValue(v.eatenAtLocal);
      const caloriesKcal = v.caloriesKcal.trim().length ? Number(v.caloriesKcal) : undefined;

      const res = await addMeal({
        dayKey,
        eatenAt,
        mealType: v.mealType,
        text: v.text,
        caloriesKcal,
        note: v.note.trim().length ? v.note : undefined,
        itemsJson: itemsJson ?? undefined,
        aiAssisted: aiAssisted ? true : undefined,
      });

      if (!res.ok) {
        setMsg(res.error);
        return;
      }

      setMsg("Added ✅");
      setItemsJson(null);
      setAiAssisted(false);
      reset({ ...defaults, eatenAtLocal: toLocalInputValue(new Date().toISOString()) });
      router.refresh();
    });
  });

  const preview = safeJsonPreview(itemsJson);

  return (
    <Card glass style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>Add meal</div>
          <div className="cb-muted" style={{ fontSize: 12 }}>{dayKey}</div>
        </div>
        {msg ? <div className="cb-muted" style={{ fontSize: 12, textAlign: "right" }}>{msg}</div> : null}
      </div>

      <form onSubmit={onSubmit} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>Time</span>
          <input type="datetime-local" {...register("eatenAtLocal")} style={inputStyle} disabled={disabled || savePending} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>Type</span>
          <select {...register("mealType")} style={inputStyle} disabled={disabled || savePending}>
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Snack">Snack</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span className="cb-muted" style={{ fontSize: 12 }}>What did you eat?</span>
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

          <textarea
            {...register("text", { required: true })}
            rows={3}
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
            disabled={disabled || savePending}
          />
          {formState.errors.text ? <span style={{ fontSize: 12, color: "var(--c-secondary)" }}>Required</span> : null}
        </label>

        {preview ? (
          <div style={{ marginTop: -2, padding: 10, borderRadius: "var(--radius)", border: "1px solid var(--card-border)" }}>
            <div className="cb-muted" style={{ fontSize: 12, marginBottom: 6 }}>
              AI Preview {aiAssisted ? "(will be saved)" : ""}
            </div>
            {preview.items.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {preview.items.slice(0, 8).map((it, idx) => (
                  <li key={idx} style={{ marginBottom: 2 }}>{it}</li>
                ))}
              </ul>
            ) : (
              <div className="cb-muted" style={{ fontSize: 12 }}>No items extracted.</div>
            )}
            {preview.notes ? <div className="cb-muted" style={{ fontSize: 12, marginTop: 6 }}>{preview.notes}</div> : null}
          </div>
        ) : null}

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>Calories (optional)</span>
          <input inputMode="numeric" type="number" step="1" {...register("caloriesKcal")} style={inputStyle} disabled={disabled || savePending} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>Note (optional)</span>
          <textarea {...register("note")} rows={2} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} disabled={disabled || savePending} />
        </label>

        <button type="submit" style={btnPrimary} disabled={disabled || savePending}>
          {savePending ? "Adding..." : "Add"}
        </button>
      </form>
    </Card>
  );
}