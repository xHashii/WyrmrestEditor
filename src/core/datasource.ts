import { tableMeta } from './metadata.js';
import { formatValue, quoteIdent } from './sql.js';
import { demoRows } from './demo-data.js';
import type {
  CellValue,
  ConnectionProfile,
  ConnectionStatus,
  DatabaseName,
  FilterClause,
  LookupItem,
  QueryRequest,
  QueryResult,
  Row,
  TableMeta,
} from '../shared/types.js';
import { DATABASES } from '../shared/types.js';

/**
 * Two interchangeable data sources sit behind one interface:
 *
 *  - `MySqlDataSource`  talks to a real TrinityCore server via mysql2
 *  - `DemoDataSource`   serves the in-memory dataset built from the schema
 *
 * The rest of the application never branches on which one is active.
 */
export interface DataSource {
  readonly mode: 'live' | 'demo';
  status(): ConnectionStatus;
  query(request: QueryRequest): Promise<QueryResult>;
  lookup(
    database: DatabaseName,
    table: string,
    idColumn: string,
    nameColumns: string[],
    options: { search?: string; ids?: (number | string)[]; limit?: number },
  ): Promise<LookupItem[]>;
  execute(database: DatabaseName, sql: string): Promise<void>;
  executeBatch(database: DatabaseName, table: string, statements: string[]): Promise<void>;
  close(): Promise<void>;
}

const MAX_LIMIT = 500;

function validateColumn(meta: TableMeta, name: string): string {
  const col = meta.columns.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (!col) throw new Error(`unknown column ${meta.name}.${name}`);
  return col.name;
}

interface BuiltQuery {
  where: string;
  params: CellValue[];
  order: string;
  meta: TableMeta;
}

export function buildWhere(meta: TableMeta, request: QueryRequest): BuiltQuery {
  const clauses: string[] = [];
  const params: CellValue[] = [];

  for (const filter of request.filters ?? []) {
    const column = validateColumn(meta, filter.column);
    const ident = quoteIdent(column);
    switch (filter.op) {
      case 'isNull':
        clauses.push(`${ident} IS NULL`);
        break;
      case 'notNull':
        clauses.push(`${ident} IS NOT NULL`);
        break;
      case 'contains':
        clauses.push(`${ident} LIKE ?`);
        params.push(`%${filter.value ?? ''}%`);
        break;
      case 'startsWith':
        clauses.push(`${ident} LIKE ?`);
        params.push(`${filter.value ?? ''}%`);
        break;
      case 'like':
        clauses.push(`${ident} LIKE ?`);
        params.push(String(filter.value ?? ''));
        break;
      case 'in': {
        const values = Array.isArray(filter.value) ? filter.value : [filter.value ?? null];
        if (!values.length) { clauses.push('1=0'); break; }
        clauses.push(`${ident} IN (${values.map(() => '?').join(', ')})`);
        params.push(...(values as CellValue[]));
        break;
      }
      case 'bitAnd':
        clauses.push(`(${ident} & ?) <> 0`);
        params.push(String(filter.value ?? 0));
        break;
      case '=':
      case '!=':
      case '>':
      case '>=':
      case '<':
      case '<=':
        clauses.push(`${ident} ${filter.op} ?`);
        if (Array.isArray(filter.value)) throw new Error('This filter expects one value');
        params.push((filter.value ?? null) as CellValue);
        break;
      default:
        throw new Error(`Unknown filter operator: ${filter.op}`);
    }
  }

  const search = request.search?.trim();
  if (search) {
    const searchable: string[] = [];
    const numeric = /^-?\d+$/.test(search);
    for (const col of meta.columns) {
      const isKey = meta.identityColumns.includes(col.name);
      if (numeric && col.kind === 'integer' && (isKey || col.reference)) {
        searchable.push(`${quoteIdent(col.name)} = ?`);
        params.push(search);
      } else if (col.kind === 'string' && (col.name === meta.nameColumn || /name|title|text|comment|description/i.test(col.name))) {
        searchable.push(`${quoteIdent(col.name)} LIKE ?`);
        params.push(`%${search}%`);
      }
    }
    if (searchable.length) clauses.push(`(${searchable.join(' OR ')})`);
    else if (numeric && meta.identityColumns.length) {
      clauses.push(`${quoteIdent(meta.identityColumns[0])} = ?`);
      params.push(search);
    } else clauses.push('1=0');
  }

  const orderParts = (request.orderBy ?? [])
    .map((o) => `${quoteIdent(validateColumn(meta, o.column))} ${o.direction === 'desc' ? 'DESC' : 'ASC'}`)
    .join(', ');
  const fallbackOrder = meta.identityColumns.length
    ? meta.identityColumns.map((c) => quoteIdent(c)).join(', ')
    : '';

  return {
    where: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '',
    params,
    order: orderParts ? ` ORDER BY ${orderParts}` : fallbackOrder ? ` ORDER BY ${fallbackOrder}` : '',
    meta,
  };
}

function pageNumber(value: number | undefined, fallback: number, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error('Invalid pagination value');
  return Math.min(value, maximum);
}

/** Interpolate params purely for display, so the UI can show the real query. */
function renderSql(sql: string, params: CellValue[]): string {
  let i = 0;
  return sql.replace(/\?/g, () => {
    const value = params[i++];
    return value === null || value === undefined
      ? 'NULL'
      : typeof value === 'number'
        ? String(value)
        : formatValue(undefined, value);
  });
}

// ---------------------------------------------------------------------------
// Live MySQL
// ---------------------------------------------------------------------------

export class MySqlDataSource implements DataSource {
  readonly mode = 'live' as const;
  private pools = new Map<DatabaseName, any>();
  private statusValue: ConnectionStatus;

  private constructor(
    private readonly profile: ConnectionProfile,
    private readonly mysql: any,
    status: ConnectionStatus,
  ) {
    this.statusValue = status;
  }

  /**
   * Probe a profile without making it the live source: connect, report the
   * per-database status, then close everything. Powers the "Test connection"
   * button so a bad profile never disturbs the current session.
   */
  static async probe(profile: ConnectionProfile): Promise<ConnectionStatus> {
    const source = await MySqlDataSource.connect(profile);
    const status = source.status();
    await source.close();
    return status;
  }

  static async connect(profile: ConnectionProfile): Promise<MySqlDataSource> {
    const mysql = await import('mysql2/promise');
    const status: ConnectionStatus = {
      mode: 'live',
      connected: false,
      profile: { ...profile } as Omit<ConnectionProfile, 'password'>,
      serverVersion: null,
      message: null,
      databases: {},
    };
    delete (status.profile as unknown as Record<string, unknown>).password;

    const source = new MySqlDataSource(profile, mysql, status);
    await Promise.all(DATABASES.map(async (db) => {
      const schema = profile.databases[db];
      if (!schema) {
        status.databases[db] = { available: false, tables: 0, error: 'not configured' };
        return;
      }
      let pool: any;
      try {
        pool = mysql.createPool({
          host: profile.host,
          port: profile.port,
          user: profile.user,
          password: profile.password,
          database: schema,
          waitForConnections: true,
          connectionLimit: 4,
          connectTimeout: 5000,
          dateStrings: true,
          supportBigNumbers: true,
          bigNumberStrings: true,
          multipleStatements: false,
        });
        const [rows] = await pool.query('SELECT VERSION() AS version, COUNT(*) AS tables FROM information_schema.tables WHERE table_schema = ?', [schema]);
        const info = (rows as any[])[0] ?? {};
        status.serverVersion ??= info.version ?? null;
        status.databases[db] = { available: true, tables: Number(info.tables ?? 0) };
        source.pools.set(db, pool);
        status.connected = true;
      } catch (err) {
        if (pool) await pool.end().catch(() => undefined);
        status.databases[db] = { available: false, tables: 0, error: (err as Error).message };
      }
    }));
    if (!status.connected) {
      const first = Object.values(status.databases).find((d) => d?.error);
      throw new Error(first?.error ?? 'could not connect to any configured schema');
    }
    status.message = `connected to ${profile.host}:${profile.port}`;
    return source;
  }

  status(): ConnectionStatus {
    return this.statusValue;
  }

  private pool(database: DatabaseName) {
    const pool = this.pools.get(database);
    if (!pool) throw new Error(`database "${database}" is not configured on this connection`);
    return pool;
  }

  async query(request: QueryRequest): Promise<QueryResult> {
    const meta = tableMeta(request.database, request.table);
    const { where, params, order } = buildWhere(meta, request);
    const limit = pageNumber(request.limit, 100, 1, MAX_LIMIT);
    const offset = pageNumber(request.offset, 0, 0);
    const started = Date.now();
    const pool = this.pool(request.database);

    const sql = `SELECT * FROM ${quoteIdent(meta.name)}${where}${order} LIMIT ${limit} OFFSET ${offset}`;
    const [rows] = await pool.query(sql, params);
    let total: number | null = null;
    try {
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM ${quoteIdent(meta.name)}${where}`,
        params,
      );
      total = Number((countRows as any[])[0]?.total ?? 0);
    } catch {
      total = null;
    }

    return {
      rows: (rows as Record<string, unknown>[]).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) =>
        [key, Buffer.isBuffer(value) ? `0x${value.toString('hex').toUpperCase()}` : value as CellValue]))),
      total,
      offset,
      limit,
      truncated: (rows as Row[]).length === limit,
      durationMs: Date.now() - started,
      sql: renderSql(sql, params),
    };
  }

  async lookup(
    database: DatabaseName,
    table: string,
    idColumn: string,
    nameColumns: string[],
    options: { search?: string; ids?: (number | string)[]; limit?: number },
  ): Promise<LookupItem[]> {
    const meta = tableMeta(database, table);
    const limit = pageNumber(options.limit, 50, 1, 200);
    const cols = [idColumn, ...nameColumns].map((c) => quoteIdent(validateColumn(meta, c)));
    const params: CellValue[] = [];
    const clauses: string[] = [];

    if (options.ids && !options.ids.length) return [];
    if (options.ids?.length) {
      clauses.push(`${quoteIdent(idColumn)} IN (${options.ids.map(() => '?').join(', ')})`);
      params.push(...(options.ids as CellValue[]));
    }
    const search = options.search?.trim();
    if (search) {
      const parts: string[] = [];
      if (/^-?\d+$/.test(search)) {
        parts.push(`${quoteIdent(idColumn)} = ?`);
        params.push(search);
      }
      for (const name of nameColumns) {
        const col = meta.columns.find((c) => c.name === name);
        if (col?.kind === 'string') {
          parts.push(`${quoteIdent(name)} LIKE ?`);
          params.push(`%${search}%`);
        }
      }
      if (parts.length) clauses.push(`(${parts.join(' OR ')})`);
    }

    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const sql = `SELECT DISTINCT ${cols.join(', ')} FROM ${quoteIdent(meta.name)}${where} ORDER BY ${quoteIdent(idColumn)} LIMIT ${limit}`;
    const [rows] = await this.pool(database).query(sql, params);
    return (rows as Row[]).map((row) => toLookupItem(row, idColumn, nameColumns));
  }

  async execute(database: DatabaseName, sql: string): Promise<void> {
    await this.pool(database).query(sql);
  }

  async executeBatch(database: DatabaseName, table: string, statements: string[]): Promise<void> {
    const connection = await this.pool(database).getConnection();
    try {
      const [engines] = await connection.query(
        'SELECT ENGINE AS engine FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', [table]);
      if (String(engines[0]?.engine).toLowerCase() !== 'innodb') {
        throw new Error(`${table}: safe live apply requires an InnoDB table. Export SQL for manual review instead.`);
      }
      await connection.beginTransaction();
      try {
        for (const sql of statements) await connection.query(sql);
        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      }
    } finally {
      connection.release();
    }
  }

  async close(): Promise<void> {
    for (const pool of this.pools.values()) await pool.end().catch(() => undefined);
    this.pools.clear();
  }
}

// ---------------------------------------------------------------------------
// Offline demo
// ---------------------------------------------------------------------------

function sqlLike(value: string, pattern: string): boolean {
  let regex = '^';
  let escaped = false;
  for (const char of pattern) {
    if (!escaped && char === '\\') { escaped = true; continue; }
    if (!escaped && char === '%') regex += '.*';
    else if (!escaped && char === '_') regex += '.';
    else regex += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    escaped = false;
  }
  if (escaped) regex += '\\\\';
  return new RegExp(regex + '$', 'is').test(value);
}

function matchesFilter(row: Row, filter: FilterClause): boolean {
  const value = row[filter.column];
  const target = filter.value as CellValue;
  switch (filter.op) {
    case 'isNull':
      return value === null || value === undefined;
    case 'notNull':
      return value !== null && value !== undefined;
    case 'contains':
      return String(value ?? '').toLowerCase().includes(String(target ?? '').toLowerCase());
    case 'startsWith':
      return String(value ?? '').toLowerCase().startsWith(String(target ?? '').toLowerCase());
    case 'like':
      return sqlLike(String(value ?? ''), String(target ?? ''));
    case 'in':
      return (Array.isArray(filter.value) ? filter.value : [filter.value]).some((v) => String(v) === String(value));
    case 'bitAnd':
      try { return (BigInt(String(value ?? 0)) & BigInt(String(target ?? 0))) !== 0n; } catch { return false; }
    case '!=':
      return String(value) !== String(target);
    case '>':
      return Number(value) > Number(target);
    case '>=':
      return Number(value) >= Number(target);
    case '<':
      return Number(value) < Number(target);
    case '<=':
      return Number(value) <= Number(target);
    default:
      return String(value) === String(target);
  }
}

export class DemoDataSource implements DataSource {
  readonly mode = 'demo' as const;

  status(): ConnectionStatus {
    const databases: ConnectionStatus['databases'] = {};
    for (const db of DATABASES) databases[db] = { available: true, tables: 0 };
    return {
      mode: 'demo',
      connected: true,
      profile: null,
      serverVersion: 'offline sample data',
      message: 'Demo mode — schema is real, rows are a small built-in sample. Connect a server to edit live data.',
      databases,
    };
  }

  async query(request: QueryRequest): Promise<QueryResult> {
    const meta = tableMeta(request.database, request.table);
    const started = Date.now();
    let rows = [...demoRows(request.database, request.table)];

    for (const filter of request.filters ?? []) {
      const column = validateColumn(meta, filter.column);
      rows = rows.filter((row) => matchesFilter(row, { ...filter, column }));
    }

    const search = request.search?.trim().toLowerCase();
    if (search) {
      rows = rows.filter((row) =>
        Object.entries(row).some(([key, value]) => {
          const col = meta.columns.find((c) => c.name === key);
          if (!col) return false;
          if (col.kind === 'string') return String(value ?? '').toLowerCase().includes(search);
          return String(value ?? '') === search;
        }),
      );
    }

    for (const order of [...(request.orderBy ?? [])].reverse()) {
      const dir = order.direction === 'desc' ? -1 : 1;
      rows.sort((a, b) => {
        const av = a[order.column];
        const bv = b[order.column];
        if (av === bv) return 0;
        if (av === null || av === undefined) return -dir;
        if (bv === null || bv === undefined) return dir;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }

    const offset = pageNumber(request.offset, 0, 0);
    const limit = pageNumber(request.limit, 100, 1, MAX_LIMIT);
    const page = rows.slice(offset, offset + limit);
    const { where, params, order } = buildWhere(meta, request);

    return {
      rows: structuredClone(page),
      total: rows.length,
      offset,
      limit,
      truncated: false,
      durationMs: Date.now() - started,
      sql: renderSql(
        `SELECT * FROM ${quoteIdent(meta.name)}${where}${order} LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
    };
  }

  async lookup(
    database: DatabaseName,
    table: string,
    idColumn: string,
    nameColumns: string[],
    options: { search?: string; ids?: (number | string)[]; limit?: number },
  ): Promise<LookupItem[]> {
    const rows = demoRows(database, table);
    const search = options.search?.trim().toLowerCase();
    const ids = options.ids?.map((v) => String(v));
    const filtered = rows.filter((row) => {
      if (ids && !ids.includes(String(row[idColumn]))) return false;
      if (!search) return true;
      if (String(row[idColumn]) === search) return true;
      return nameColumns.some((n) => String(row[n] ?? '').toLowerCase().includes(search));
    });
    return filtered.slice(0, pageNumber(options.limit, 50, 1, 200)).map((row) => toLookupItem(row, idColumn, nameColumns));
  }

  async execute(database: DatabaseName, sql: string): Promise<void> {
    // Demo mode has nowhere to apply statements; the ledger + export path is
    // still fully functional, which is what the demo is for.
    throw new Error('demo mode is read-only for live execution — export the SQL instead');
  }

  async close(): Promise<void> {
    /* nothing to close */
  }

  async executeBatch(database: DatabaseName, _table: string, statements: string[]): Promise<void> {
    await this.execute(database, statements[0] ?? '');
  }

}

function toLookupItem(row: Row, idColumn: string, nameColumns: string[]): LookupItem {
  const names = nameColumns.map((n) => row[n]).filter((v) => v !== null && v !== undefined && v !== '');
  return {
    id: row[idColumn] as number | string,
    name: names.length ? String(names[0]) : `#${row[idColumn]}`,
    detail: names.length > 1 ? String(names[1]) : undefined,
  };
}
