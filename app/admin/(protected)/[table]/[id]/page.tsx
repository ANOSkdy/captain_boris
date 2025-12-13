import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchRowDetail } from "@/lib/admin/db";
import { databaseConfigHint, isDatabaseConfigured } from "@/lib/db/isConfigured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: { table: string; id: string };
};

export default async function RowDetailPage({ params }: PageProps) {
  if (!isDatabaseConfigured()) {
    return (
      <main style={{ display: "grid", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.9rem" }}>
            <Link href="/admin" style={{ color: "#2563eb" }}>
              テーブル一覧
            </Link>{" "}/{" "}
            <Link href={`/admin/${params.table}`} style={{ color: "#2563eb" }}>
              {params.table}
            </Link>
          </p>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>レコード詳細</h1>
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
    const { row, columns } = await fetchRowDetail(params.table, params.id);
    if (!row) {
      notFound();
    }

    return (
      <main style={{ display: "grid", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.9rem" }}>
            <Link href="/admin" style={{ color: "#2563eb" }}>
              テーブル一覧
            </Link>{" "}
            /{" "}
            <Link href={`/admin/${params.table}`} style={{ color: "#2563eb" }}>
              {params.table}
            </Link>
          </p>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>レコード詳細</h1>
          <p style={{ color: "#4a5568" }}>ID: {params.id}</p>
        </div>

        <section style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1rem" }}>
          <h2 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>値</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {columns.map((column) => (
                <tr key={column.column_name}>
                  <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #e2e8f0", width: "30%" }}>
                    {column.column_name}
                  </th>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                    {String(row[column.column_name] ?? "")}<span style={{ color: "#cbd5e1" }}>&nbsp;</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1rem" }}>
          <h2 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>JSON</h2>
          <pre
            style={{
              background: "#0f172a",
              color: "#e2e8f0",
              padding: "1rem",
              borderRadius: "8px",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(row, null, 2)}
          </pre>
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
              テーブル一覧
            </Link>{" "}/{" "}
            <Link href={`/admin/${params.table}`} style={{ color: "#2563eb" }}>
              {params.table}
            </Link>
          </p>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>レコード詳細</h1>
          <p style={{ color: "#dc2626" }}>
            レコードの取得に失敗しました。接続設定・権限・ID を確認してください。
          </p>
          <p style={{ color: "#4a5568", fontSize: "0.95rem" }}>
            確認ポイント: {configHint}
          </p>
        </div>
      </main>
    );
  }
}
