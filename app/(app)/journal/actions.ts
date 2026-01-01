"use server";

import { z } from "zod";

import { createJournalEntry, deleteJournalEntry, updateJournalEntry } from "@/lib/db/repositories/journalRepo";
import { getOwnerKey } from "@/lib/actions/common";
import { fail, ok, type ActionResult, toErrorMessage } from "@/lib/actions/result";
import { journalInputSchema } from "@/lib/domain/validators";
import { invalidateJournalEntry, invalidateJournalList } from "@/lib/cache/revalidate";
import { normalizeAttachments } from "@/lib/journal/attachments";

const formSchema = z.object({
  title: z.string().min(1),
  details: z.string().min(1),
  attach: z.string().optional(),
});

function parseAttachInput(raw: string | undefined | null) {
  const text = raw?.trim();
  if (!text) return [];

  let parsed: unknown;
  if (text.startsWith("[")) {
    parsed = JSON.parse(text);
  } else if (text.startsWith("{")) {
    parsed = [JSON.parse(text)];
  } else {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    parsed = lines.map((url) => ({ url }));
  }

  if (!Array.isArray(parsed)) {
    throw new Error("attach は配列である必要があります");
  }

  const normalized = normalizeAttachments(parsed);
  return journalInputSchema.shape.attach.parse(normalized);
}

function normalizeInput(formData: FormData) {
  const parsed = formSchema.parse({
    title: formData.get("title"),
    details: formData.get("details"),
    attach: formData.get("attach")?.toString(),
  });

  const ownerKey = getOwnerKey();
  const attach = parseAttachInput(parsed.attach);

  const validated = journalInputSchema.parse({
    ownerKey,
    title: parsed.title,
    details: parsed.details,
    attach,
  });

  return validated;
}

export async function createJournalAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const input = normalizeInput(formData);

    const entry = await createJournalEntry({
      ownerKey: input.ownerKey,
      title: input.title,
      details: input.details,
      attach: input.attach,
    });

    invalidateJournalEntry(input.ownerKey, entry.id);
    return ok({ id: entry.id });
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}

export async function updateJournalAction(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const input = normalizeInput(formData);

    const entry = await updateJournalEntry({
      id,
      ownerKey: input.ownerKey,
      title: input.title,
      details: input.details,
      attach: input.attach,
    });

    invalidateJournalEntry(input.ownerKey, entry.id);
    return ok({ id: entry.id });
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}

export async function deleteJournalAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const ownerKey = getOwnerKey();
    await deleteJournalEntry({ id, ownerKey });
    invalidateJournalList(ownerKey);
    return ok({ id });
  } catch (e) {
    return fail(toErrorMessage(e));
  }
}
