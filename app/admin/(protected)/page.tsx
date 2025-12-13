import Link from "next/link";

import { listPublicTables } from "@/lib/admin/db";
import { databaseConfigHint, isDatabaseConfigured } from "@/lib/db/isConfigured";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  if (!isDatabaseConfigured()) {
    return (
      <main>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>データブラウザ</h1>
        <p style={{ color: "#4a5568", marginBottom: "1rem" }}>
          データベース接続が設定されていません。環境変数を設定して再度お試しください。
        </p>
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

  try {
    const tables = await listPublicTables();
    return (
      <main>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>データブラウザ</h1>
        <p style={{ color: "#4a5568", marginBottom: "1rem" }}>
          公開スキーマのテーブルを選択し、スキーマとデータを参照できます。
        </p>
        <ul style={{ display: "grid", gap: "0.5rem", padding: 0, listStyle: "none" }}>
          {tables.map((table) => (
            <li
              key={table}
              style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.75rem" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{table}</div>
                  <div style={{ fontSize: "0.9rem", color: "#4a5568" }}>スキーマ + レコード閲覧</div>
                </div>
                <Link href={`/admin/${table}`} style={{ color: "#2563eb" }}>
                  開く
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </main>
    );
  } catch (error) {
    console.error(error);
    return (
      <main>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>データブラウザ</h1>
        <p style={{ color: "#dc2626" }}>
          テーブルの取得に失敗しました。接続設定と権限をご確認ください。
        </p>
        <p style={{ color: "#4a5568", fontSize: "0.95rem" }}>{databaseConfigHint()}</p>
      </main>
    );
  }
}
