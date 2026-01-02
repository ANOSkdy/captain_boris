import "server-only";

import { getOwnerKey as getServerOwnerKey } from "@/lib/server/ownerKey";

export const getOwnerKey = getServerOwnerKey;

export function getAppTz(): string {
  return process.env.APP_TZ && process.env.APP_TZ.length > 0 ? process.env.APP_TZ : "Asia/Tokyo";
}

export function nowIso(): string {
  return new Date().toISOString();
}
