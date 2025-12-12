import "server-only";

export function getOwnerKey(): string {
  return process.env.OWNER_KEY && process.env.OWNER_KEY.length > 0 ? process.env.OWNER_KEY : "default";
}

export function getAppTz(): string {
  return process.env.APP_TZ && process.env.APP_TZ.length > 0 ? process.env.APP_TZ : "Asia/Tokyo";
}

export function nowIso(): string {
  return new Date().toISOString();
}