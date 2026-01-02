import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { JournalForm } from "@/components/forms/JournalForm";
import { getCachedJournalEntry } from "@/lib/journal/cache";
import { isDatabaseConfigured, databaseConfigHint } from "@/lib/db/isConfigured";
import { getOwnerKey } from "@/lib/server/ownerKey";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function logNotFound(reason: "missing_id" | "invalid_uuid" | "db_null", id: string, ownerKey: string) {
  console.warn(
    `[journal][detail][notFound] route=app/(app)/journal/[id]/page.tsx reason=${reason} id=${id} ownerKey=${ownerKey}`
  );
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function JournalDetailPage({ params }: { params: { id: string } }) {
  const ownerKey = getOwnerKey();
  const id = (params?.id ?? "").trim();

  if (!id) {
    logNotFound("missing_id", id, ownerKey);
    notFound();
  }

  if (!uuidPattern.test(id)) {
    logNotFound("invalid_uuid", id, ownerKey);
    notFound();
  }

  let entry = null;
  let error: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      entry = await getCachedJournalEntry(ownerKey, id);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const missing = isDatabaseConfigured() && !error && !entry;

  if (missing) {
    logNotFound("db_null", id, ownerKey);
    notFound();
  }

  const rightSlot = (
    <Link href="/journal" style={{ fontWeight: 700 }}>
      一覧へ
    </Link>
  );

  return (
    <AppShell title="ジャーナル詳細" rightSlot={rightSlot}>
      {!isDatabaseConfigured() ? (
        <Card glass style={{ padding: 12 }}>
          <div style={{ fontWeight: 900 }}>Postgres が未設定です</div>
          <p className="cb-muted" style={{ margin: "8px 0 0" }}>{databaseConfigHint()}</p>
        </Card>
      ) : null}

      {error ? (
        <Card glass style={{ padding: 12, border: "1px solid rgba(190, 82, 242, 0.6)" }}>
          <div style={{ fontWeight: 900 }}>読み込みエラー</div>
          <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{error}</pre>
        </Card>
      ) : null}

      {entry ? (
        <Card glass style={{ padding: 12 }}>
          <div style={{ fontWeight: 900 }}>{entry.title}</div>
          <div className="cb-muted" style={{ fontSize: 12, marginTop: 4 }}>
            作成: {fmtDateTime(entry.createdAt)} / 更新: {fmtDateTime(entry.updatedAt)}
          </div>
        </Card>
      ) : null}

      <JournalForm
        mode="edit"
        entryId={id}
        defaultValues={
          entry
            ? { title: entry.title, details: entry.details, attachArray: entry.attach }
            : undefined
        }
        redirectTo="/journal"
        disabled={!isDatabaseConfigured() || Boolean(error)}
      />
    </AppShell>
  );
}
