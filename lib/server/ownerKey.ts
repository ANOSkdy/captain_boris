import "server-only";

export function getOwnerKey(): string {
  return process.env.OWNER_KEY && process.env.OWNER_KEY.length > 0 ? process.env.OWNER_KEY : "default";
}
