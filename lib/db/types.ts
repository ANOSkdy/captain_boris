import "server-only";

export type DbRecord<TFields extends Record<string, any>> = {
  id: string;
  createdTime: string;
  fields: TFields;
};

export type OwnerDay = { ownerKey: string; dayKey: string };

export function normalizeOwnerDayArgs(ownerKey: string, dayKey: string): OwnerDay;
export function normalizeOwnerDayArgs(input: OwnerDay): OwnerDay;
export function normalizeOwnerDayArgs(
  ownerKeyOrInput: string | OwnerDay,
  dayKey?: string
): OwnerDay {
  if (typeof ownerKeyOrInput === "string") {
    if (!dayKey) throw new Error("dayKey is required");
    return { ownerKey: ownerKeyOrInput, dayKey };
  }
  return ownerKeyOrInput;
}

export function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toDateOnly(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export type DateRangeInput =
  | { ownerKey: string; startInclusive: string; endExclusive: string }
  | { ownerKey: string; from: string; to: string }
  | { ownerKey: string; after: string; before: string }
  | { ownerKey: string; fromExclusive: string; toExclusive: string }
  | { ownerKey: string; startInclusive: string; endExclusive: string };

export function normalizeDateRange(input: DateRangeInput): {
  ownerKey: string;
  startInclusive: string;
  endExclusive: string;
} {
  const start =
    "startInclusive" in input
      ? input.startInclusive
      : "from" in input
        ? input.from
        : "fromExclusive" in input
          ? addDays(input.fromExclusive, 1)
          : addDays(input.after, 1);

  const end =
    "endExclusive" in input
      ? input.endExclusive
      : "to" in input
        ? addDays(input.to, 1)
        : "toExclusive" in input
          ? input.toExclusive
          : input.before;

  return { ownerKey: input.ownerKey, startInclusive: start.slice(0, 10), endExclusive: end.slice(0, 10) };
}

function addDays(dayKey: string, add: number): string {
  const d = new Date(dayKey);
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}
