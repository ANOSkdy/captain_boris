import Link from "next/link";

import { isAdminProtectionEnabled, requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="admin-shell" style={{ padding: "1.5rem" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <Link href="/admin" style={{ fontWeight: 700, fontSize: "1.1rem" }}>
          Admin Console
        </Link>
        {isAdminProtectionEnabled() ? (
          <Link href="/admin/logout" style={{ color: "#d33" }}>
            ログアウト
          </Link>
        ) : (
          <span style={{ color: "#4a5568", fontSize: "0.9rem" }}>ローカル閲覧モード</span>
        )}
      </header>
      <div>{children}</div>
    </div>
  );
}
