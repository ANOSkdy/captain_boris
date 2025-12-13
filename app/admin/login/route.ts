import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const token = formData.get("token")?.toString() ?? "";
  const required = process.env.ADMIN_TOKEN;

  if (!required) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  if (token === required) {
    const res = NextResponse.redirect(new URL("/admin", req.url));
    res.cookies.set({
      name: "admin_token",
      value: token,
      path: "/admin",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  const url = new URL("/admin/login", req.url);
  url.searchParams.set("error", "invalid");
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (token && (!process.env.ADMIN_TOKEN || token === process.env.ADMIN_TOKEN)) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  return NextResponse.redirect(new URL("/admin/login", req.url));
}
