import "server-only";

import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { JournalForm } from "@/components/forms/JournalForm";
import { getCachedJournalEntries } from "@/lib/journal/cache";
import { isDatabaseConfigured, databaseConfigHint } from "@/lib/db/isConfigured";
import { getOwnerKey } from "@/lib/actions/common";
import { deleteJournalAction } from "./actions";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function JournalPage() {
  const ownerKey = getOwnerKey();

  let entries: Awaited<ReturnType<typeof getCachedJournalEntries>> = [];
  let error: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      entries = await getCachedJournalEntries(ownerKey);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function onDelete(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await deleteJournalAction(id);
  }

  const actionSlot = (
    <Link href="#journal-new" className="icon-button" aria-label="新規ジャーナルを開く">
      <PlusIcon className="nav-icon" />
    </Link>
  );

  return (
    <AppShell title="ジャーナル" actionSlot={actionSlot}>
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

      <CollapsibleSection title="新規作成" defaultOpen collapsedSummary="＋" subtitle="タイトル / 詳細 / 添付" >
        <div id="journal-new" />
        <JournalForm mode="create" disabled={!isDatabaseConfigured() || Boolean(error)} />
      </CollapsibleSection>

      <Card glass style={{ padding: 12, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>最新のエントリー</div>
        {isDatabaseConfigured() && !error && entries.length === 0 ? (
          <div className="cb-muted">まだ記録がありません。</div>
        ) : null}

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {entries.map((entry) => (
            <li key={entry.id} style={{ padding: 12, border: "1px solid var(--card-border)", borderRadius: "var(--radius)", display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <Link href={`/journal/${entry.id}`} style={{ fontWeight: 800 }}>
                  {entry.title}
                </Link>
                <div className="cb-muted" style={{ fontSize: 12 }}>
                  更新: {fmtDate(entry.updatedAt)}
                </div>
              </div>
              <div className="cb-muted" style={{ whiteSpace: "pre-wrap" }}>
                {entry.details.slice(0, 160)}
                {entry.details.length > 160 ? "…" : ""}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <Link
                  href={`/journal/${entry.id}`}
                  style={{
                    minHeight: "var(--tap)",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--card-border)",
                    padding: "8px 12px",
                    color: "var(--fg)",
                    fontWeight: 700,
                  }}
                >
                  編集
                </Link>
                <form action={onDelete}>
                  <input type="hidden" name="id" value={entry.id} />
                  <button
                    type="submit"
                    style={{
                      minHeight: "var(--tap)",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--card-border)",
                      padding: "8px 12px",
                      background: "transparent",
                      color: "var(--fg)",
                      fontWeight: 700,
                    }}
                    disabled={!isDatabaseConfigured() || Boolean(error)}
                  >
                    削除
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
