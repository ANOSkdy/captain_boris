"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { createJournalAction, updateJournalAction } from "@/app/(app)/journal/actions";
import { Card } from "@/components/Card";

const formSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  details: z.string().min(1, "本文は必須です"),
  attach: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  mode: "create" | "edit";
  entryId?: string;
  defaultValues?: Partial<FormValues> & { attachArray?: unknown[] };
  onSuccess?: () => void;
  disabled?: boolean;
  redirectTo?: string;
};

function attachToTextarea(attach: unknown[] | undefined): string {
  if (!attach || attach.length === 0) return "";
  try {
    return JSON.stringify(attach, null, 2);
  } catch {
    return "";
  }
}

const formResolver: Resolver<FormValues> = async (values) => {
  const result = formSchema.safeParse(values);
  if (result.success) {
    return { values: result.data, errors: {} };
  }

  const fieldErrors = result.error.flatten().fieldErrors;
  const errors = Object.fromEntries(
    Object.entries(fieldErrors).map(([key, messages]) => [
      key,
      { type: "validation", message: messages?.[0] ?? "入力エラー" },
    ])
  );

  return { values: {}, errors };
};

export function JournalForm({ mode, entryId, defaultValues, onSuccess, disabled, redirectTo }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const defaults = useMemo<FormValues>(
    () => ({
      title: defaultValues?.title ?? "",
      details: defaultValues?.details ?? "",
      attach: defaultValues?.attach ?? attachToTextarea(defaultValues?.attachArray),
    }),
    [defaultValues]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: formResolver,
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
    fontWeight: 700,
  };

  const onSubmit = handleSubmit((values) => {
    setMsg(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", values.title.trim());
      fd.set("details", values.details.trim());
      fd.set("attach", values.attach?.trim() ?? "");

      const res =
        mode === "create"
          ? await createJournalAction(fd)
          : await updateJournalAction(entryId ?? "", fd);

      if (!res.ok) {
        setMsg(res.error);
        return;
      }

      setMsg(mode === "create" ? "追加しました ✅" : "保存しました ✅");
      if (mode === "create") {
        reset({ ...defaults, title: "", details: "", attach: "" });
      }
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
      onSuccess?.();
    });
  });

  return (
    <Card glass style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>{mode === "create" ? "ジャーナルを追加" : "ジャーナルを編集"}</div>
          <div className="cb-muted" style={{ fontSize: 12 }}>
            タイトルと本文は必須です。
          </div>
        </div>
        {msg ? (
          <div className="cb-muted" style={{ fontSize: 12, textAlign: "right" }}>
            {msg}
          </div>
        ) : null}
      </div>

      <form onSubmit={onSubmit} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>
            タイトル
          </span>
          <input
            type="text"
            {...register("title")}
            style={inputStyle}
            disabled={disabled || pending}
            placeholder="今日の気づき"
          />
          {errors.title ? (
            <span style={{ fontSize: 12, color: "var(--c-secondary)" }}>{errors.title.message}</span>
          ) : null}
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>
            詳細
          </span>
          <textarea
            rows={4}
            {...register("details")}
            style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
            disabled={disabled || pending}
            placeholder="本文を入力してください"
          />
          {errors.details ? (
            <span style={{ fontSize: 12, color: "var(--c-secondary)" }}>{errors.details.message}</span>
          ) : null}
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="cb-muted" style={{ fontSize: 12 }}>
            添付（任意）
          </span>
          <textarea
            rows={3}
            {...register("attach")}
            style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
            disabled={disabled || pending}
            placeholder={`例）
https://example.com
https://example.com/2`}
          />
          <div className="cb-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            空欄は []。先頭が [ なら JSON 配列、&#123; なら JSON オブジェクト（配列に包む）、それ以外は改行区切りの URL を
            {"{ url: ... }"} に変換します。
          </div>
          {errors.attach ? (
            <span style={{ fontSize: 12, color: "var(--c-secondary)" }}>{errors.attach.message}</span>
          ) : null}
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          <button type="submit" style={btnPrimary} disabled={disabled || pending}>
            {pending ? "保存中..." : mode === "create" ? "追加する" : "保存する"}
          </button>
          {mode === "create" ? (
            <button
              type="button"
              style={btnGhost}
              onClick={() => reset(defaults)}
              disabled={disabled || pending}
            >
              クリア
            </button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
