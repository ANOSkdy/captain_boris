import "server-only";

export function ownerTag(ownerKey: string): string {
  return `cb:owner:${ownerKey}`;
}

export function monthTag(ownerKey: string, month: string): string {
  return `cb:month:${ownerKey}:${month}`;
}

export function dayTag(ownerKey: string, dayKey: string): string {
  return `cb:day:${ownerKey}:${dayKey}`;
}

export function tagsForMonth(ownerKey: string, month: string): string[] {
  return [ownerTag(ownerKey), monthTag(ownerKey, month)];
}

export function tagsForDay(ownerKey: string, dayKey: string): string[] {
  const month = dayKey.slice(0, 7); // YYYY-MM
  return [ownerTag(ownerKey), monthTag(ownerKey, month), dayTag(ownerKey, dayKey)];
}
