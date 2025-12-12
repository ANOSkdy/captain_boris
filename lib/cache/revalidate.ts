import "server-only";

import { revalidateTag } from "next/cache";
import { ownerTag, monthTag, dayTag } from "./tags";

// Next.js 16 expects (tag, profile)
const CACHE_PROFILE: string = "default";

function safeRevalidate(tag: string): void {
  try {
    revalidateTag(tag, CACHE_PROFILE);
  } catch {
    // ignore (should be called only from Server Actions / Route Handlers)
  }
}

export function invalidateOwner(ownerKey: string): void {
  safeRevalidate(ownerTag(ownerKey));
}

export function invalidateMonth(ownerKey: string, month: string): void {
  safeRevalidate(monthTag(ownerKey, month));
  safeRevalidate(ownerTag(ownerKey));
}

export function invalidateDay(ownerKey: string, dayKeyStr: string): void {
  const month = dayKeyStr.slice(0, 7);
  safeRevalidate(dayTag(ownerKey, dayKeyStr));
  safeRevalidate(monthTag(ownerKey, month));
  safeRevalidate(ownerTag(ownerKey));
}
