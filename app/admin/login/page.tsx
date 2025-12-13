import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  isAdminProtectionEnabled,
  persistAdminToken,
} from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function getError(searchParams?: PageProps["searchParams"]): string | null {
  if (!searchParams) return null;
  const value = searchParams["error"];
  const code = Array.isArray(value) ? value[0] : value;
  if (code === "invalid") return "トークンが違います";
  return null;
}

async function handleLogin(formData: FormData) {
  "use server";

  const required = process.env.ADMIN_TOKEN;
  if (!required) {
    redirect("/admin");
  }

  const token = formData.get("token")?.toString() ?? "";
  if (token === required) {
    await persistAdminToken(token);
    redirect("/admin");
  }

  redirect("/admin/login?error=invalid");
}

export default async function AdminLogin({ searchParams }: PageProps) {
  const protectionEnabled = isAdminProtectionEnabled();
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("admin_token")?.value;

  if (!protectionEnabled || cookieToken === process.env.ADMIN_TOKEN) {
    redirect("/admin");
  }

  const error = getError(searchParams);

  return (
    <main style={{ padding: "1.5rem", maxWidth: 520 }}>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>Admin ログイン</h1>
      <p style={{ color: "#4a5568", marginBottom: "1rem" }}>
        {protectionEnabled
          ? "ADMIN_TOKEN を入力して /admin を閲覧します。"
          : "ADMIN_TOKEN が未設定のため、ローカル確認用として認証なしで閲覧できます。"}
      </p>

      <form action={handleLogin} style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.9rem", color: "#4a5568" }}>ADMIN_TOKEN</span>
          <input
            name="token"
            type="password"
            disabled={!protectionEnabled}
            placeholder={protectionEnabled ? "環境変数 ADMIN_TOKEN" : "未設定"}
            style={{ padding: "0.6rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
          />
        </label>
        {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="submit"
            disabled={!protectionEnabled}
            style={{
              padding: "0.65rem 1rem",
              background: protectionEnabled ? "#2563eb" : "#94a3b8",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: protectionEnabled ? "pointer" : "not-allowed",
            }}
          >
            ログイン
          </button>
          <Link href="/admin" style={{ color: "#2563eb" }}>
            戻る
          </Link>
        </div>
      </form>
    </main>
  );
}
