import "server-only";

import { getDb } from "../client";
import { ensureSchema } from "../schema";
import { toIsoString } from "../types";
import { normalizeAttachments } from "@/lib/journal/attachments";

export type JournalEntry = {
  id: string;
  ownerKey: string;
  title: string;
  details: string;
  attach: unknown[];
  createdAt: string;
  updatedAt: string;
};

type JournalRow = {
  id: string;
  owner_key: string;
  title: string;
  details: string;
  attach: unknown;
  created_at: string | Date;
  updated_at: string | Date;
};

function mapJournal(row: JournalRow): JournalEntry {
  return {
    id: row.id,
    ownerKey: row.owner_key,
    title: row.title,
    details: row.details,
    attach: normalizeAttachments(row.attach),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export async function listJournalEntries(input: {
  ownerKey: string;
  limit?: number;
  offset?: number;
}): Promise<JournalEntry[]> {
  await ensureSchema();
  const sql = getDb();
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;
  const rows = await sql<JournalRow[]>`
    SELECT * FROM journal_entries
    WHERE owner_key=${input.ownerKey}
    ORDER BY updated_at DESC
    LIMIT ${limit} OFFSET ${offset};
  `;
  return rows.map(mapJournal);
}

export async function getJournalEntryById(input: {
  id: string;
  ownerKey: string;
}): Promise<JournalEntry | null> {
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<JournalRow[]>`
    SELECT * FROM journal_entries
    WHERE id=${input.id} AND owner_key=${input.ownerKey}
    LIMIT 1;
  `;
  return rows[0] ? mapJournal(rows[0]) : null;
}

export async function createJournalEntry(input: {
  ownerKey: string;
  title: string;
  details: string;
  attach: unknown[];
}): Promise<JournalEntry> {
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<JournalRow[]>`
    INSERT INTO journal_entries (owner_key, title, details, attach)
    VALUES (${input.ownerKey}, ${input.title}, ${input.details}, ${sql.json(input.attach)})
    RETURNING *;
  `;
  return mapJournal(rows[0]);
}

export async function updateJournalEntry(input: {
  id: string;
  ownerKey: string;
  title: string;
  details: string;
  attach: unknown[];
}): Promise<JournalEntry> {
  await ensureSchema();
  const sql = getDb();
  const rows = await sql<JournalRow[]>`
    UPDATE journal_entries
    SET title=${input.title}, details=${input.details}, attach=${sql.json(input.attach)}
    WHERE id=${input.id} AND owner_key=${input.ownerKey}
    RETURNING *;
  `;
  if (!rows[0]) throw new Error("Journal entry not found");
  return mapJournal(rows[0]);
}

export async function deleteJournalEntry(input: { id: string; ownerKey: string }): Promise<void> {
  await ensureSchema();
  const sql = getDb();
  await sql`
    DELETE FROM journal_entries
    WHERE id=${input.id} AND owner_key=${input.ownerKey};
  `;
}
