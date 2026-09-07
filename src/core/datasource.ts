import { entityMeta, metadataIndex, tableMeta, trySmartData } from './metadata.js';
import { parseSearch } from '../shared/search.js';
import type { SearchScope, SearchToken } from '../shared/search.js';
import { formatValue, quoteIdent } from './sql.js';
import { demoRows } from './demo-data.js';
import type {
  CellValue,
  ColumnMeta,
  ConnectionProfile,
  SmartScriptSummary,
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
  /** Distinct (entryorguid, source_type) scripts, most rows first. */
  smartScripts(options: { search?: string; sourceType?: number; limit: number; entries?: (number | string)[] }): Promise<SmartScriptSummary[]>;
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

/** Cap how much of a wide table a text search may scan, keeping MySQL sane. */
const MAX_SEARCH_COLUMNS = 40;
/** How many entities a single search may resolve names for. */
const MAX_SEARCH_ENTITIES = 8;
/** Ids accepted per resolved entity — a name search should be selective. */
const MAX_SEARCH_IDS = 40;

/**
 * Columns whose values are ids of some other table, even when the schema does
 * not declare them as such. `smart_scripts` is the important case: a row's
 * `action_param1` holds a spell for CAST, a creature entry for SUMMON, and so
 * on. Those columns have no single reference, but searching them by name is
 * exactly what makes a script editable ("find every script that uses Fireball").
 */
const hinted = new Map<string, Map<string, string[]>>();

export function searchHintsFor(meta: TableMeta): Map<string, string[]> {
  const key = `${meta.database}.${meta.name}`;
  const cached = hinted.get(key);
  if (cached) return cached;
  const byEntity = new Map<string, string[]>();
  const add = (column: string, entity: string) => {
    const list = byEntity.get(entity) ?? [];
    if (!list.includes(column)) list.push(column);
    byEntity.set(entity, list);
  };
  const columns = new Set(meta.columns.map((column) => column.name));
  if (meta.database === 'world' && meta.name === 'smart_scripts') {
    const data = trySmartData();
    if (data) {
      for (const def of [...data.events, ...data.actions, ...data.targets]) {
        for (const param of def.params ?? []) if (param.entity && columns.has(param.column)) add(param.column, param.entity);
      }
      for (const source of data.sourceTypes) {
        if (source.entity) add('entryorguid', source.entity);
      }
      for (const entity of Object.values(data.sourceTypeEntityForNegative ?? {})) {
        if (entity) add('entryorguid', entity);
      }
    }
  }
  hinted.set(key, byEntity);
  return byEntity;
}

export interface SearchContext {
  meta: TableMeta;
  /** entity → columns holding ids of that entity (schema references + hints). */
  columnsByEntity: Map<string, string[]>;
  textColumns: ColumnMeta[];
  idColumns: ColumnMeta[];
}

export function searchContext(meta: TableMeta): SearchContext {
  const columnsByEntity = new Map<string, string[]>();
  const add = (entity: string, column: string) => {
    const list = columnsByEntity.get(entity) ?? [];
    if (!list.includes(column)) list.push(column);
    columnsByEntity.set(entity, list);
  };
  for (const column of meta.columns) {
    const reference = column.reference;
    if (reference?.entity && !reference.self) add(reference.entity, column.name);
  }
  const formal = new Set([...columnsByEntity.values()].flat());
  for (const [entity, columns] of searchHintsFor(meta)) {
    for (const column of columns) if (!formal.has(column)) add(entity, column);
  }
  const hintedColumns = new Set([...searchHintsFor(meta).values()].flat());
  const strings = meta.columns.filter((column) => column.kind === 'string');
  const named = strings.filter((column) => column.name === meta.nameColumn || /name|title|text|comment|description/i.test(column.name));
  return {
    meta,
    columnsByEntity,
    textColumns: [...named, ...strings.filter((column) => !named.includes(column))].slice(0, MAX_SEARCH_COLUMNS),
    idColumns: meta.columns.filter((column) => column.kind === 'integer'
      && (meta.identityColumns.includes(column.name) || column.reference || hintedColumns.has(column.name))),
  };
}

export interface SearchLookup {
  entity: string;
  /** Every word that must match this entity; an entity hit is their intersection. */
  terms: string[];
}

export interface SearchPlan {
  tokens: SearchToken[];
  /** Names to resolve into ids per entity before the query runs. */
  lookups: SearchLookup[];
  scope: SearchScope;
}

export function planSearch(
  context: SearchContext,
  request: Pick<QueryRequest, 'search' | 'searchScope'>,
  entityKeys: string[],
): SearchPlan {
  const raw = request.search?.trim() ?? '';
  if (!raw) return { tokens: [], lookups: [], scope: 'all' };
  const tokens = parseSearch(raw, context.meta.columns.map((column) => column.name), entityKeys).tokens;
  const scope: SearchScope = request.searchScope ?? 'all';
  const known = new Set(context.columnsByEntity.keys());
  const wanted = new Map<string, string[]>();
  const addLookup = (entity: string, term: string) => {
    if (!known.has(entity) || /^-?\d+$/.test(term)) return;
    const list = wanted.get(entity) ?? [];
    if (!list.includes(term)) list.push(term);
    wanted.set(entity, list);
  };
  const broadEntities = [...known].slice(0, MAX_SEARCH_ENTITIES);
  for (const token of tokens) {
    if (token.kind === 'entity') addLookup(token.entity, token.value);
    else if (token.kind === 'text' && (scope === 'all' || scope === 'references')) {
      // A bare word is looked up against everything this table can reference,
      // which is how "Hogger" finds his loot rows, scripts and quests at once.
      for (const entity of broadEntities) addLookup(entity, token.value);
    }
  }
  const lookups = [...wanted].map(([entity, terms]) => ({ entity, terms: [...new Set(terms)] }));
  return { tokens, lookups, scope };
}

/**
 * The `WHERE` fragment for the search box, or null when there is nothing to add.
 * `referenceIds` maps an entity to the ids whose *name* matched the search,
 * which is what makes "Hogger" find every script, loot or quest row that refers
 * to the creature called Hogger — not only rows holding that text themselves.
 */
export function searchClause(
  context: SearchContext,
  plan: SearchPlan,
  referenceIds: Record<string, CellValue[]>,
): { sql: string; params: CellValue[]; notes: string[] } | null {
  if (!plan.tokens.length) return null;
  const { meta, columnsByEntity, textColumns, idColumns } = context;
  const { scope, tokens } = plan;
  const wantsNames = scope === 'all' || scope === 'names';
  const wantsIds = scope === 'all' || scope === 'ids';
  const wantsReferences = scope === 'all' || scope === 'references';

  const clauses: string[] = [];
  const params: CellValue[] = [];
  const notes: string[] = [];
  for (const token of tokens) {
    if (token.kind === 'unknown') { notes.push(`“${token.key}:${token.value}” is not a column or a known reference, so it was ignored`); continue; }
    const parts: string[] = [];
    if (token.kind === 'text') {
      const numeric = /^-?\d+$/.test(token.value);
      if (wantsNames) {
        for (const column of textColumns) {
          parts.push(`${quoteIdent(column.name)} LIKE ?`);
          params.push(`%${token.value}%`);
        }
      }
      if (wantsIds && numeric) {
        for (const column of idColumns) {
          parts.push(`${quoteIdent(column.name)} = ?`);
          params.push(token.value);
        }
      }
      if (wantsReferences) {
        for (const [entity, columns] of columnsByEntity) {
          const ids = referenceIds[entity] ?? [];
          if (!ids.length) continue;
          for (const column of columns) {
            parts.push(`${quoteIdent(column)} IN (${ids.slice(0, MAX_SEARCH_IDS).map(() => '?').join(', ')})`);
            params.push(...ids.slice(0, MAX_SEARCH_IDS));
          }
        }
      }
      if (!parts.length) notes.push(numeric ? 'this table has no id column to match a number against' : 'this table has no text column to search');
    } else if (token.kind === 'column') {
      const column = validateColumn(meta, token.column);
      if (token.op === 'like' || token.op === 'startsWith') {
        parts.push(`${quoteIdent(column)} LIKE ?`);
        params.push(token.op === 'like' ? `%${token.value}%` : `${token.value}%`);
      } else if (token.op === '=') {
        parts.push(`${quoteIdent(column)} = ?`);
        params.push(token.value);
      } else {
        parts.push(`${quoteIdent(column)} ${token.op} ?`);
        params.push(token.value);
      }
    } else if (token.kind === 'entity') {
      const columns = columnsByEntity.get(token.entity) ?? [];
      if (!columns.length) {
        notes.push(`this table has no ${token.entity} reference, so “${token.entity}:${token.value}” cannot match`);
        if (!token.not) return { sql: '1=0', params: [], notes };
        continue;
      }
      const ids = (referenceIds[token.entity] ?? []).slice(0, MAX_SEARCH_IDS);
      const exact = /^-?\d+$/.test(token.value) ? token.value : null;
      const local: string[] = [];
      if (exact !== null) for (const column of columns) { local.push(`${quoteIdent(column)} = ?`); params.push(exact); }
      if (ids.length) for (const column of columns) { local.push(`${quoteIdent(column)} IN (${ids.map(() => '?').join(', ')})`); params.push(...ids); }
      if (!local.length) { notes.push(`no ${token.entity} named “${token.value}” was found, so nothing can reference it`); return { sql: '1=0', params: [], notes }; }
      parts.push(`(${local.join(' OR ')})`);
    }
    if (!parts.length) continue;
    clauses.push(token.not ? `NOT (${parts.join(' OR ')})` : `(${parts.join(' OR ')})`);
  }
  if (!clauses.length) {
    // Still report why nothing could match: a search that silently returns
    // zero rows is indistinguishable from an empty table.
    return notes.length ? { sql: '1=0', params: [], notes } : null;
  }
  return { sql: clauses.join(' AND '), params, notes };
}

/** One `entity:term` part of a search, described for the user. */
export interface SearchReferenceHit {
  entity: string;
  term: string;
  matches: number;
  /** `Name (id)` of the first few matches, so a chip can show what was meant. */
  shown: string[];
  failed?: boolean;
}

/** A request plus everything the name lookups produced. */
export type PreparedQuery = QueryRequest & {
  searchPlan: SearchPlan;
  referenceIds: Record<string, CellValue[]>;
  searchReferences?: SearchReferenceHit[];
};

/** Everything a search needs: column classification, tokens and resolved names. */
export async function prepareSearch(
  meta: TableMeta,
  request: QueryRequest,
  source: Pick<DataSource, 'lookup'>,
): Promise<{ context: SearchContext; plan: SearchPlan; referenceIds: Record<string, CellValue[]>; references: SearchReferenceHit[] }> {
  const context = searchContext(meta);
  const plan = planSearch(context, request, Object.keys(metadataIndex().entities));
  if (!plan.tokens.length) return { context, plan, referenceIds: {}, references: [] };
  const lookup = async (entity: string, search: string): Promise<LookupItem[]> => {
    const value = entityMeta(entity);
    return source.lookup(value.database, value.table, value.idColumn, value.nameColumns, { search, limit: MAX_SEARCH_IDS });
  };
  const resolved = await resolveSearchIds(plan, lookup);
  return { context, plan, referenceIds: resolved.ids, references: resolved.hits };
}

/**
 * Resolve the reference-name part of a search before the query runs: name
 * lookups need the database, so `buildWhere` alone cannot do them.
 */
export async function withSearchContext(
  meta: TableMeta,
  request: QueryRequest,
  source: Pick<DataSource, 'lookup'>,
): Promise<PreparedQuery> {
  const prepared = await prepareSearch(meta, request, source);
  return { ...request, searchPlan: prepared.plan, referenceIds: prepared.referenceIds, searchReferences: prepared.references };
}

/** Ids of rows in the referenced entity whose name matches one search term. */
async function resolveSearchIds(
  plan: SearchPlan,
  lookup: (entity: string, search: string) => Promise<LookupItem[]>,
): Promise<{ ids: Record<string, CellValue[]>; hits: SearchReferenceHit[] }> {
  const out: Record<string, CellValue[]> = {};
  const hits: SearchReferenceHit[] = [];
  if (!plan.lookups.length) return { ids: out, hits };
  for (const { entity, terms } of plan.lookups.slice(0, MAX_SEARCH_ENTITIES)) {
    const perTerm: CellValue[][] = [];
    for (const term of terms) {
      try {
        const items = await lookup(entity, term);
        perTerm.push(items.map((item) => item.id).slice(0, MAX_SEARCH_IDS));
        hits.push({ entity, term, matches: items.length, shown: items.slice(0, 3).map((item) => `${item.name} (${String(item.id)})`) });
      } catch {
        // A name lookup is an enrichment; the raw search still works without it.
        perTerm.push([]);
        hits.push({ entity, term, matches: 0, shown: [], failed: true });
      }
    }
    if (!perTerm.length) continue;
    // Every word must match the same entity ("Hogger Westfall" stays an AND).
    let merged = perTerm[0];
    for (const list of perTerm.slice(1)) {
      const next = merged.filter((id) => list.some((other) => String(other) === String(id)));
      if (next.length) merged = next;
    }
    const unique = [...new Set(merged.map((id) => String(id)))];
    if (unique.length) out[entity] = unique;
  }
  return { ids: out, hits };
}

/**
 * The in-memory twin of `searchClause`, so demo rows answer a search exactly
 * the way a live MySQL server would.
 */
export function rowMatcherFor(
  context: SearchContext,
  plan: SearchPlan,
  token: SearchToken,
  referenceIds: Record<string, CellValue[]>,
): (row: Row) => boolean {
  const { meta, columnsByEntity, textColumns, idColumns } = context;
  const lowered = new Map(meta.columns.map((column) => [column.name.toLowerCase(), column]));
  const scope = plan.scope;
  const wantsNames = scope === 'all' || scope === 'names';
  const wantsIds = scope === 'all' || scope === 'ids';
  const wantsReferences = scope === 'all' || scope === 'references';

  const test = (row: Row): boolean => {
    if (token.kind === 'unknown') return true;
    if (token.kind === 'column') {
      const column = lowered.get(token.column.toLowerCase());
      if (!column) return false;
      const value = row[column.name];
      const target = token.value;
      switch (token.op) {
        case 'like': return String(value ?? '').toLowerCase().includes(target.toLowerCase());
        case 'startsWith': return String(value ?? '').toLowerCase().startsWith(target.toLowerCase());
        case '=': return String(value ?? '') === target;
        case '!=': return String(value ?? '') !== target;
        case '>': return Number(value) > Number(target);
        case '>=': return Number(value) >= Number(target);
        case '<': return Number(value) < Number(target);
        case '<=': return Number(value) <= Number(target);
        default: return false;
      }
    }
    const numeric = /^-?\d+$/.test(token.value);
    if (token.kind === 'entity') {
      const ids = (referenceIds[token.entity] ?? []).map(String);
      const columns = columnsByEntity.get(token.entity) ?? [];
      if (!columns.length) return false;
      const exact = numeric ? token.value : null;
      const matched = columns.some((column) => {
        const value = row[column];
        if (value === null || value === undefined) return false;
        if (exact !== null && String(value) === exact) return true;
        return ids.includes(String(value));
      });
      if (!columns.length || (!ids.length && !numeric)) return false;
      return matched;
    }
    const term = token.value.toLowerCase();
    const nameHit = wantsNames && textColumns.some((column) => String(row[column.name] ?? '').toLowerCase().includes(term));
    const idHit = wantsIds && numeric && idColumns.some((column) => String(row[column.name] ?? '') === token.value);
    const referenceHit = wantsReferences && [...columnsByEntity.entries()].some(([entity, columns]) => {
      const ids = (referenceIds[entity] ?? []).map(String);
      return columns.some((column) => ids.includes(String(row[column] ?? '')));
    });
    return nameHit || idHit || referenceHit;
  };
  return token.not ? (row) => !test(row) : test;
}

export function buildWhere(
  meta: TableMeta,
  request: QueryRequest & { searchPlan?: SearchPlan; referenceIds?: Record<string, CellValue[]> },
): { where: string; params: CellValue[]; order: string; meta: TableMeta; searchNotes: string[] } {
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
  const searchNotes: string[] = [];
  if (search) {
    const context = searchContext(meta);
    const plan = request.searchPlan ?? planSearch(context, request, Object.keys(metadataIndex().entities));
    const clause = searchClause(context, plan, request.referenceIds ?? {});
    if (clause) {
      searchNotes.push(...clause.notes);
      clauses.push(`(${clause.sql})`);
      params.push(...clause.params);
    } else {
      clauses.push('1=0');
    }
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
    searchNotes,
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
    const prepared = await withSearchContext(meta, request, this);
    const { where, params, order, searchNotes } = buildWhere(meta, prepared);
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
      searchNotes,
      searchReferences: prepared.searchReferences?.length ? prepared.searchReferences : undefined,
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

  async smartScripts(options: { search?: string; sourceType?: number; limit: number; entries?: (number | string)[] }): Promise<SmartScriptSummary[]> {
    const limit = pageNumber(options.limit, 40, 1, 200);
    const clauses: string[] = [];
    const params: CellValue[] = [];
    if (Number.isInteger(options.sourceType)) {
      clauses.push('source_type = ?');
      params.push(options.sourceType as number);
    }
    const ids = [...new Set((options.entries ?? []).map((entry) => String(entry)))];
    const term = options.search?.trim();
    const numeric = term && /^-?\d+$/.test(term) ? term : null;
    if (ids.length || numeric) {
      const parts: string[] = [];
      if (ids.length) {
        parts.push(`entryorguid IN (${ids.slice(0, 400).map(() => '?').join(', ')})`);
        params.push(...ids.slice(0, 400));
      }
      if (numeric) {
        parts.push('entryorguid = ?');
        params.push(numeric);
      }
      clauses.push(`(${parts.join(' OR ')})`);
    }
    if (term && !numeric) {
      // A script usually says what it is in its comments, so searching by the
      // scripted creature's name works even when its entry is unknown.
      clauses.push('comment LIKE ?');
      params.push(`%${term}%`);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const sql = `SELECT entryorguid, source_type, COUNT(*) AS row_count, SUM(event_type <> 0) AS event_count,` +
      ` MIN(id) AS first_id, MAX(id) AS last_id, MIN(comment) AS sample FROM smart_scripts${where}` +
      ` GROUP BY entryorguid, source_type ORDER BY row_count DESC, entryorguid ASC LIMIT ${limit}`;
    const [rows] = await this.pool('world').query(sql, params);
    return (rows as Record<string, unknown>[]).map((row) => ({
      entryorguid: row.entryorguid as number | string,
      sourceType: Number(row.source_type),
      rows: Number(row.row_count),
      events: Number(row.event_count),
      name: null,
      nameResolved: false,
      kind: null,
    }));
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

/**
 * The in-memory twin of `searchClause`, so demo rows answer a search exactly
 * the way a live MySQL server would.
 */
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

    const prepared = await prepareSearch(meta, request, this);
    const preparedQuery: PreparedQuery = {
      ...request, searchPlan: prepared.plan, referenceIds: prepared.referenceIds, searchReferences: prepared.references,
    };
    const searchNotes: string[] = [];
    if (prepared.plan.tokens.length) {
      // Same rules as the live source: text columns, ids, and the names of
      // referenced creatures / objects / spells / quests, resolved offline
      // from the demo rows. `searchClause` is the shared judge of "no match",
      // so demo and MySQL answer a search identically.
      const clause = searchClause(prepared.context, prepared.plan, prepared.referenceIds);
      searchNotes.push(...(clause?.notes ?? []));
      if (clause?.sql === '1=0') rows = [];
      else {
        const matchers = prepared.plan.tokens.map((token) => rowMatcherFor(prepared.context, prepared.plan, token, prepared.referenceIds));
        rows = rows.filter((row) => matchers.every((matches) => matches(row)));
      }
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
    const { where, params, order, searchNotes: sqlNotes } = buildWhere(meta, preparedQuery);

    return {
      rows: structuredClone(page),
      total: rows.length,
      offset,
      limit,
      truncated: false,
      durationMs: Date.now() - started,
      searchNotes: searchNotes.length ? searchNotes : sqlNotes,
      searchReferences: prepared.references.length ? prepared.references : undefined,
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

  async smartScripts(options: { search?: string; sourceType?: number; limit: number; entries?: (number | string)[] }): Promise<SmartScriptSummary[]> {
    const term = options.search?.trim().toLowerCase() ?? '';
    const numeric = /^-?\d+$/.test(term) ? term : null;
    const wanted = options.entries?.map((entry) => String(entry));
    const groups = new Map<string, SmartScriptSummary>();
    for (const row of demoRows('world', 'smart_scripts')) {
      const sourceType = Number(row.source_type ?? 0);
      const entryorguid = String(row.entryorguid ?? '0');
      if (Number.isInteger(options.sourceType) && sourceType !== options.sourceType) continue;
      if (wanted?.length && !wanted.includes(entryorguid) && entryorguid !== numeric) continue;
      if (term && entryorguid !== numeric && !wanted?.includes(entryorguid) && !String(row.comment ?? '').toLowerCase().includes(term)) continue;
      const key = `${entryorguid}:${sourceType}`;
      const summary = groups.get(key) ?? { entryorguid: row.entryorguid as number | string, sourceType, rows: 0, events: 0, name: null, nameResolved: false, kind: null };
      summary.rows++;
      if (Number(row.event_type ?? 0) !== 0) summary.events++;
      groups.set(key, summary);
    }
    return [...groups.values()].sort((a, b) => b.rows - a.rows || Number(a.entryorguid) - Number(b.entryorguid)).slice(0, pageNumber(options.limit, 40, 1, 200));
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
