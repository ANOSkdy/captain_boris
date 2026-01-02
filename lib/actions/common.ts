import "server-only";

import { resolveOwnerKey } from "@/lib/ownerKey";

export function getOwnerKey(): string {
  return resolveOwnerKey();
}

export function getAppTz(): string {
  return process.env.APP_TZ && process.env.APP_TZ.length > 0 ? process.env.APP_TZ : "Asia/Tokyo";
}

export function nowIso(): string {
  return new Date().toISOString();
}
