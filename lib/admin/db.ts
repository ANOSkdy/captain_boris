import "server-only";

import { getDb } from "@/lib/db/client";

export type TableColumn = {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
};

export type RowFilters = {
  ownerKey?: string;
  dayKey?: string;
  from?: string;
  to?: string;
};

export type PaginatedRows = {
  rows: Record<string, unknown>[];
  total: number;
  columns: TableColumn[];
  dateColumn: string | null;
  identifierColumn: string | null;
};

const DATE_COLUMN_PRIORITY = [
  "day_date",
  "eaten_at",
  "performed_at",
  "sleep_start_at",
  "recorded_at",
  "created_at",
  "updated_at",
];

let cachedTables: string[] | undefined;

export async function listPublicTables(): Promise<string[]> {
  if (!cachedTables) {
    const sql = getDb();
    const rows = await sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `;
    cachedTables = rows.map((r: { table_name: string }) => r.table_name);
  }
  return cachedTables ?? [];
}

async function assertAllowedTable(tableName: string): Promise<void> {
  const tables = await listPublicTables();
  if (!tables.includes(tableName)) {
    throw new Error(`Table ${tableName} is not in the allowlist`);
  }
}

export async function getTableSchema(tableName: string): Promise<TableColumn[]> {
  await assertAllowedTable(tableName);
  const sql = getDb();
  const rows = await sql`
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = ${tableName}
    order by ordinal_position
  `;
  return rows as TableColumn[];
}

function resolveDateColumn(columns: TableColumn[]): string | null {
  const fromPriority = DATE_COLUMN_PRIORITY.find((name) =>
    columns.some((c) => c.column_name === name),
  );
  return fromPriority ?? null;
}

function resolveIdentifierColumn(columns: TableColumn[]): string | null {
  if (hasColumn(columns, "id")) return "id";
  return columns[0]?.column_name ?? null;
}

function hasColumn(columns: TableColumn[], name: string): boolean {
  return columns.some((c) => c.column_name === name);
}

function buildWhereClauses(sql: any, columns: TableColumn[], filters: RowFilters) {
  const clauses: any[] = [];
  if (filters.ownerKey && hasColumn(columns, "owner_key")) {
    clauses.push(sql`owner_key = ${filters.ownerKey}`);
  }
  if (filters.dayKey && hasColumn(columns, "day_key")) {
    clauses.push(sql`day_key = ${filters.dayKey}`);
  }
  const dateColumn = resolveDateColumn(columns);
  if (dateColumn && filters.from) {
    clauses.push(sql`${sql(dateColumn)} >= ${filters.from}`);
  }
  if (dateColumn && filters.to) {
    clauses.push(sql`${sql(dateColumn)} <= ${filters.to}`);
  }
  return { clauses, dateColumn };
}

export async function fetchRows(
  tableName: string,
  options: { limit: number; offset: number; filters: RowFilters },
): Promise<PaginatedRows> {
  await assertAllowedTable(tableName);
  const columns = await getTableSchema(tableName);
  const sql = getDb();
  const { clauses, dateColumn } = buildWhereClauses(sql, columns, options.filters);
  const whereSql = clauses.length ? sql`where ${sql.join(clauses, sql` AND `)}` : sql``;
  const identifierColumn = resolveIdentifierColumn(columns);
  const orderColumn = sql(dateColumn ?? identifierColumn ?? "1");
  const tableIdentifier = sql(tableName);

  const rows = await sql`
    select *
    from ${tableIdentifier}
    ${whereSql}
    order by ${orderColumn} desc
    limit ${options.limit}
    offset ${options.offset}
  `;

  const countResult = await sql`
    select count(*)::int as count
    from ${tableIdentifier}
    ${whereSql}
  `;

  return {
    rows,
    total: Number(countResult?.[0]?.count ?? 0),
    columns,
    dateColumn,
    identifierColumn,
  };
}

export async function fetchRowDetail(
  tableName: string,
  id: string,
): Promise<{ row: Record<string, unknown> | null; columns: TableColumn[] }> {
  await assertAllowedTable(tableName);
  const columns = await getTableSchema(tableName);
  const identifierColumn = resolveIdentifierColumn(columns);
  if (!identifierColumn) {
    throw new Error(`No identifier column for table ${tableName}`);
  }
  const sql = getDb();
  const tableIdentifier = sql(tableName);
  const rows = await sql`
    select *
    from ${tableIdentifier}
    where ${sql(identifierColumn)} = ${id}
    limit 1
  `;
  return { row: rows?.[0] ?? null, columns };
}
