import "server-only";

export type AirtableRecord<TFields extends Record<string, any>> = {
  id: string;
  createdTime: string;
  fields: TFields;
};

export type AirtableSort = { field: string; direction?: "asc" | "desc" };

export type AirtableListOptions = {
  baseId?: string;
  view?: string;
  maxRecords?: number;
  pageSize?: number;
  offset?: string;
  filterByFormula?: string;
  sort?: AirtableSort[];
  fields?: string[];

  /**
   * Next.js Data Cache tags for GET requests.
   * - If tags are provided, GET uses force-cache by default and can be invalidated by revalidateTag().
   * - If tags are NOT provided, GET uses no-store.
   */
  tags?: string[];
  cache?: RequestCache; // default: force-cache when tags exist
};

type AirtableListResponse<TFields extends Record<string, any>> = {
  records: AirtableRecord<TFields>[];
  offset?: string;
};

type AirtableBatchResponse<TFields extends Record<string, any>> = {
  records: AirtableRecord<TFields>[];
};

type AirtableDeleteResponse = {
  records: Array<{ id: string; deleted: true }>;
};

type NextFetchOptions = {
  tags?: string[];
  revalidate?: number;
};

type AirtableFetchInit = RequestInit & {
  next?: NextFetchOptions;
};

const API_BASE = "https://api.airtable.com/v0";

export function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getEnvOr(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

export function getTableName(envName: string, fallback: string): string {
  const v = process.env[envName];
  return v && v.length > 0 ? v : fallback;
}

export function escapeFormulaValue(value: string): string {
  // Airtable formula strings use single quotes. Escape single quote to avoid broken formulas.
  return value.replace(/'/g, "\\'");
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getRequiredEnv("AIRTABLE_API_KEY")}`,
    "Content-Type": "application/json",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function requestJson<T>(url: string, init: AirtableFetchInit, attempt = 0): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
    cache: init.cache ?? "no-store",
  });

  if (res.ok) {
    return (await res.json()) as T;
  }

  const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
  if (retryable && attempt < 4) {
    const backoff = 250 * Math.pow(2, attempt) + Math.floor(Math.random() * 80);
    await sleep(backoff);
    return requestJson<T>(url, init, attempt + 1);
  }

  const text = await res.text().catch(() => "");
  throw new Error(`Airtable request failed: ${res.status} ${res.statusText} url=${url} body=${text}`);
}

function buildListUrl(baseId: string, table: string, opts: AirtableListOptions): string {
  const url = new URL(`${API_BASE}/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`);

  if (opts.view) url.searchParams.set("view", opts.view);
  if (opts.maxRecords != null) url.searchParams.set("maxRecords", String(opts.maxRecords));
  if (opts.pageSize != null) url.searchParams.set("pageSize", String(opts.pageSize));
  if (opts.offset) url.searchParams.set("offset", opts.offset);
  if (opts.filterByFormula) url.searchParams.set("filterByFormula", opts.filterByFormula);

  if (opts.fields?.length) {
    for (const f of opts.fields) url.searchParams.append("fields[]", f);
  }

  if (opts.sort?.length) {
    opts.sort.forEach((s, i) => {
      url.searchParams.set(`sort[${i}][field]`, s.field);
      if (s.direction) url.searchParams.set(`sort[${i}][direction]`, s.direction);
    });
  }

  return url.toString();
}

export async function listPage<TFields extends Record<string, any>>(
  table: string,
  opts: AirtableListOptions = {}
): Promise<AirtableListResponse<TFields>> {
  const baseId = opts.baseId ?? getRequiredEnv("AIRTABLE_BASE_ID");
  const url = buildListUrl(baseId, table, opts);

  const hasTags = Boolean(opts.tags && opts.tags.length > 0);
  const nextOpt = hasTags ? { tags: opts.tags } : undefined;
  const cacheOpt: RequestCache = hasTags ? (opts.cache ?? "force-cache") : "no-store";

  return requestJson<AirtableListResponse<TFields>>(url, {
    method: "GET",
    next: nextOpt,
    cache: cacheOpt,
  });
}

export async function listAll<TFields extends Record<string, any>>(
  table: string,
  opts: AirtableListOptions = {}
): Promise<AirtableRecord<TFields>[]> {
  const records: AirtableRecord<TFields>[] = [];
  let offset: string | undefined = opts.offset;

  for (;;) {
    const page = await listPage<TFields>(table, { ...opts, offset });
    records.push(...page.records);
    if (!page.offset) break;
    offset = page.offset;
  }

  return records;
}

export async function createOne<TFields extends Record<string, any>>(
  table: string,
  fields: TFields,
  opts: { baseId?: string; typecast?: boolean } = {}
): Promise<AirtableRecord<TFields>> {
  const baseId = opts.baseId ?? getRequiredEnv("AIRTABLE_BASE_ID");
  const url = `${API_BASE}/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`;

  const payload = {
    records: [{ fields }],
    typecast: opts.typecast ?? true,
  };

  const res = await requestJson<AirtableBatchResponse<TFields>>(url, {
    method: "POST",
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return res.records[0];
}

export async function updateOne<TFields extends Record<string, any>>(
  table: string,
  id: string,
  fields: Partial<TFields>,
  opts: { baseId?: string; typecast?: boolean } = {}
): Promise<AirtableRecord<TFields>> {
  const baseId = opts.baseId ?? getRequiredEnv("AIRTABLE_BASE_ID");
  const url = `${API_BASE}/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`;

  const payload = {
    records: [{ id, fields }],
    typecast: opts.typecast ?? true,
  };

  const res = await requestJson<AirtableBatchResponse<TFields>>(url, {
    method: "PATCH",
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return res.records[0];
}

export async function deleteOne(
  table: string,
  id: string,
  opts: { baseId?: string } = {}
): Promise<void> {
  const baseId = opts.baseId ?? getRequiredEnv("AIRTABLE_BASE_ID");
  const url = new URL(`${API_BASE}/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`);
  url.searchParams.append("records[]", id);

  const res = await requestJson<AirtableDeleteResponse>(url.toString(), {
    method: "DELETE",
    cache: "no-store",
  });

  const ok = res.records?.some((r) => r.id === id && r.deleted === true);
  if (!ok) throw new Error(`Airtable delete failed: table=${table} id=${id}`);
}
