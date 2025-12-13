import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchRows, getTableSchema } from "@/lib/admin/db";
import { databaseConfigHint, isDatabaseConfigured } from "@/lib/db/isConfigured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

type PageProps = {
  params: { table: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

function readParam(searchParams: PageProps["searchParams"], key: string): string | undefined {
  if (!searchParams) return undefined;
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function parsePaging(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function buildQuery(params: URLSearchParams, overrides: Record<string, string | number | undefined>) {
  const copy = new URLSearchParams(params);
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      copy.delete(key);
    } else {
      copy.set(key, String(value));
    }
  });
  return copy.toString();
}

export default async function TablePage({ params, searchParams }: PageProps) {
  const tableName = params.table;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parsePaging(readParam(searchParams, "limit"), DEFAULT_LIMIT)));
  const offset = Math.max(0, parsePaging(readParam(searchParams, "offset"), 0));
  const ownerKey = readParam(searchParams, "owner_key");
  const dayKey = readParam(searchParams, "day_key");
  const from = readParam(searchParams, "from");
  const to = readParam(searchParams, "to");

  if (!isDatabaseConfigured()) {
    return (
      <main style={{ display: "grid", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.9rem" }}>
            <Link href="/admin" style={{ color: "#2563eb" }}>
              テーブル一覧に戻る
            </Link>
          </p>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>{tableName}</h1>
          <p style={{ color: "#4a5568" }}>データベース接続が未設定です。</p>
        </div>

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "1rem",
            background: "#f8fafc",
            color: "#0f172a",
          }}
        >
          <p style={{ marginBottom: "0.25rem", fontWeight: 700 }}>設定ヒント</p>
          <p style={{ margin: 0 }}>{databaseConfigHint()}</p>
        </div>
      </main>
    );
  }

  const configHint = databaseConfigHint();

  try {
    const schema = await getTableSchema(tableName);
    const rows = await fetchRows(tableName, {
      limit,
      offset,
      filters: { ownerKey, dayKey, from, to },
    });

    const baseQuery = new URLSearchParams();
    if (ownerKey) baseQuery.set("owner_key", ownerKey);
    if (dayKey) baseQuery.set("day_key", dayKey);
    if (from) baseQuery.set("from", from);
    if (to) baseQuery.set("to", to);
    baseQuery.set("limit", String(limit));

    const nextOffset = offset + limit;
    const prevOffset = Math.max(0, offset - limit);
    const hasNext = nextOffset < rows.total;
    const hasPrev = offset > 0;

    return (
      <main style={{ display: "grid", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>{tableName}</h1>
          <p style={{ color: "#4a5568" }}>スキーマとレコードを閲覧できます。</p>
        </div>

        <section style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1rem" }}>
          <h2 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>スキーマ</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0", padding: "0.5rem" }}>カラム</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0", padding: "0.5rem" }}>型</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0", padding: "0.5rem" }}>NULL</th>
              </tr>
            </thead>
            <tbody>
              {schema.map((column) => (
                <tr key={column.column_name}>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>{column.column_name}</td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>{column.data_type}</td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>{column.is_nullable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontWeight: 700 }}>レコード</h2>
            <span style={{ color: "#4a5568", fontSize: "0.9rem" }}>
              {offset + 1} - {Math.min(offset + limit, rows.total)} / {rows.total}
            </span>
          </div>

          <form
            style={{ display: "grid", gap: "0.5rem", margin: "0.75rem 0", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
          >
            <input type="hidden" name="limit" value={limit} />
            <label style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.9rem", color: "#4a5568" }}>owner_key</span>
              <input name="owner_key" defaultValue={ownerKey ?? ""} style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
            </label>
            <label style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.9rem", color: "#4a5568" }}>day_key</span>
              <input name="day_key" defaultValue={dayKey ?? ""} style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
            </label>
            <label style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.9rem", color: "#4a5568" }}>日付(From)</span>
              <input name="from" type="datetime-local" defaultValue={from ?? ""} style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
            </label>
            <label style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.9rem", color: "#4a5568" }}>日付(To)</span>
              <input name="to" type="datetime-local" defaultValue={to ?? ""} style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
            </label>
            <button
              type="submit"
              style={{
                alignSelf: "end",
                padding: "0.6rem 0.75rem",
                background: "#2563eb",
                color: "white",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
              }}
            >
              絞り込み
            </button>
          </form>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {rows.columns.map((col) => (
                    <th key={col.column_name} style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #e2e8f0" }}>
                      {col.column_name}
                    </th>
                  ))}
                  <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #e2e8f0" }}>詳細</th>
                </tr>
              </thead>
              <tbody>
                {rows.rows.map((row) => {
                  const identifierValue =
                    (rows.identifierColumn ? row[rows.identifierColumn] : row.id) ?? row.id;
                  const rowId = identifierValue !== undefined ? String(identifierValue) : "";
                  return (
                    <tr key={`${rowId}-${JSON.stringify(row)}`}>
                    {rows.columns.map((col) => (
                      <td key={col.column_name} style={{ padding: "0.5rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.95rem" }}>
                        {String(row[col.column_name] ?? "")}<span style={{ color: "#cbd5e1" }}>&nbsp;</span>
                      </td>
                    ))}
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                      {rowId ? (
                        <Link href={`/admin/${tableName}/${rowId}`} style={{ color: "#2563eb" }}>
                          詳細
                        </Link>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>-</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {rows.rows.length === 0 ? (
                  <tr>
                    <td colSpan={rows.columns.length + 1} style={{ padding: "0.75rem", textAlign: "center", color: "#4a5568" }}>
                      レコードがありません。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            {hasPrev && (
              <Link
                href={`/admin/${tableName}?${buildQuery(baseQuery, { offset: prevOffset })}`}
                style={{ padding: "0.5rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px" }}
              >
                前へ
              </Link>
            )}
            {hasNext && (
              <Link
                href={`/admin/${tableName}?${buildQuery(baseQuery, { offset: nextOffset })}`}
                style={{ padding: "0.5rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px" }}
              >
                次へ
              </Link>
            )}
          </div>
        </section>
      </main>
    );
  } catch (error) {
    console.error(error);
    return (
      <main style={{ display: "grid", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.9rem" }}>
            <Link href="/admin" style={{ color: "#2563eb" }}>
              テーブル一覧に戻る
            </Link>
          </p>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>{tableName}</h1>
          <p style={{ color: "#dc2626" }}>
            テーブルの取得に失敗しました。接続設定・権限・テーブル名を確認してください。
          </p>
          <p style={{ color: "#4a5568", fontSize: "0.95rem" }}>
            確認ポイント: {configHint}
          </p>
        </div>
      </main>
    );
  }
}
