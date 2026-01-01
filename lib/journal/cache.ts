import "server-only";

import { unstable_cache } from "next/cache";

import { getJournalEntryById, listJournalEntries } from "@/lib/db/repositories/journalRepo";
import { journalEntryTag, journalListTag } from "@/lib/cache/tags";

export async function getCachedJournalEntries(ownerKey: string) {
  const cached = unstable_cache(
    () => listJournalEntries({ ownerKey, limit: 50, offset: 0 }),
    [`journal:list:${ownerKey}`],
    { tags: [journalListTag(ownerKey)], revalidate: false }
  );
  return cached();
}

export async function getCachedJournalEntry(ownerKey: string, id: string) {
  const cached = unstable_cache(
    () => getJournalEntryById({ ownerKey, id }),
    [`journal:entry:${ownerKey}:${id}`],
    { tags: [journalEntryTag(ownerKey, id)], revalidate: false }
  );
  return cached();
}
