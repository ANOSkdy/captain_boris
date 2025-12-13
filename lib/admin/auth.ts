import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "admin_token";

export function isAdminProtectionEnabled(): boolean {
  return Boolean(process.env.ADMIN_TOKEN);
}

async function providedToken(): Promise<string | null> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const headerToken = headerStore.get("x-admin-token");
  const cookieToken = cookieStore.get(COOKIE_NAME)?.value;
  return headerToken ?? cookieToken ?? null;
}

export async function requireAdmin(): Promise<void> {
  if (!isAdminProtectionEnabled()) return;
  const token = await providedToken();
  if (token !== process.env.ADMIN_TOKEN) {
    redirect("/admin/login");
  }
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  if (cookieStore.get(COOKIE_NAME)) {
    cookieStore.set({
      name: COOKIE_NAME,
      value: "",
      path: "/admin",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });
  }
}

export async function persistAdminToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    path: "/admin",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}
