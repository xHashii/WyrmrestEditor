/**
 * Shared contracts between the Node side (Electron main / dev API server) and
 * the renderer. Everything crossing the IPC or HTTP boundary is described here.
 */

import type { SmartData } from './smart.js';

export type DatabaseName = 'auth' | 'characters' | 'world' | 'hotfixes';
export const DATABASES: DatabaseName[] = ['auth', 'characters', 'world', 'hotfixes'];

export type ColumnKind = 'integer' | 'float' | 'string' | 'binary' | 'datetime' | 'enum' | 'set';

export type EditorKind =
  | 'int'
  | 'float'
  | 'bool'
  | 'enum'
  | 'flags'
  | 'reference'
  | 'text'
  | 'longtext'
  | 'datetime'
  | 'binary'
  | 'coordinate'
  | 'orientation';

export interface ValueSetEntry {
  value: number | string;
  name: string;
  comment?: string;
}

export interface ValueSet {
  kind: 'enum' | 'flags';
  values: ValueSetEntry[];
}

export interface ColumnReference {
  entity: string | null;
  database: DatabaseName;
  table: string;
  column: string;
  source: 'curated' | 'schema-fk' | 'wiki';
  self?: boolean;
}

export interface ColumnMeta {
  name: string;
  ordinal: number;
  label: string;
  baseType: string;
  rawType: string;
  kind: ColumnKind;
  unsigned: boolean;
  length: number | null;
  precision: number | null;
  scale: number | null;
  members: string[] | null;
  nullable: boolean;
  hasDefault: boolean;
  default: string | null;
  autoIncrement: boolean;
  onUpdateCurrentTimestamp: boolean;
  comment: string;
  range: { min: string; max: string } | null;
  isBool: boolean;
  hint: string | null;
  description: string | null;
  docSource: 'wiki' | 'schema-comment' | null;
  editor: EditorKind;
  valueSet: ValueSet | null;
  valueSetSource: string | null;
  /** Curated opt-out: this column must not carry (or inherit) a documented enum. */
  noValueSet?: boolean;
  reference: ColumnReference | null;
  dbc: { dbc: string; column: string | null; label: string }[] | null;
  inPrimaryKey: boolean;
}

export interface TableMeta {
  database: DatabaseName;
  name: string;
  label: string;
  category: string;
  description: string | null;
  docSources: string[];
  engine: string | null;
  isView: boolean;
  readOnly: boolean;
  primaryKey: string[];
  uniqueKeys: { name: string | null; columns: string[] }[];
  indexes: { name: string | null; columns: string[]; type: string }[];
  foreignKeys: {
    name: string | null;
    columns: string[];
    refTable: string;
    refColumns: string[];
    onDelete: string | null;
    onUpdate: string | null;
  }[];
  identityColumns: string[];
  nameColumn: string | null;
  autoIncrementColumn: string | null;
  columns: ColumnMeta[];
}

export interface CatalogueEntry {
  database: DatabaseName;
  name: string;
  label: string;
  category: string;
  columns: number;
  pk: string[];
  readOnly: boolean;
  documented: boolean;
  featured: boolean;
  description: string | null;
}

export interface EntityMeta {
  key: string;
  label: string;
  icon: string;
  database: DatabaseName;
  table: string;
  idColumn: string;
  nameColumns: string[];
  pk: string[];
}

export interface MetadataIndex {
  /** Content hashes of the schema dumps and doc pages the metadata came from. */
  sources: Record<string, string | null>;
  docs: Record<string, string | null>;
  databases: { name: DatabaseName; tables: number; columns: number }[];
  summary: Record<string, Record<string, number>>;
  entities: Record<string, EntityMeta>;
  featured: string[];
  tables: CatalogueEntry[];
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

export interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
  /** Passwords are saved to disk only with explicit consent. */
  rememberPassword?: boolean;
  databases: Record<DatabaseName, string>;
}

export type ConnectionMode = 'live' | 'demo';

export interface ConnectionStatus {
  mode: ConnectionMode;
  connected: boolean;
  profile: Omit<ConnectionProfile, 'password'> | null;
  serverVersion: string | null;
  message: string | null;
  /** A startup/reconnection problem, while a usable demo workspace is shown. */
  warning?: string;
  databases: Partial<Record<DatabaseName, { available: boolean; tables: number; error?: string }>>;
}

// ---------------------------------------------------------------------------
// Querying
// ---------------------------------------------------------------------------

export type CellValue = string | number | boolean | null;
export type Row = Record<string, CellValue>;

export interface FilterClause {
  column: string;
  op: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'startsWith' | 'contains' | 'in' | 'isNull' | 'notNull' | 'bitAnd';
  value?: CellValue | CellValue[];
}

export type SearchScope = 'all' | 'names' | 'ids' | 'references';

export interface QueryRequest {
  database: DatabaseName;
  table: string;
  offset?: number;
  limit?: number;
  search?: string;
  /** What `search` is allowed to look at. Defaults to 'all'. */
  searchScope?: SearchScope;
  filters?: FilterClause[];
  orderBy?: { column: string; direction: 'asc' | 'desc' }[];
}

export interface QueryResult {
  rows: Row[];
  total: number | null;
  offset: number;
  limit: number;
  truncated: boolean;
  durationMs: number;
  sql: string;
  /** How the search box interpreted the query (ignored/unknown tokens, …). */
  searchNotes?: string[];
  /** `entity:term` parts of the search and the rows they resolved to. */
  searchReferences?: { entity: string; term: string; matches: number; shown: string[]; failed?: boolean }[];
}

// ---------------------------------------------------------------------------
// SmartAI (smart_scripts)
// ---------------------------------------------------------------------------

/** A script the picker can offer: one (entryorguid, source_type) pair. */
export interface SmartScriptSummary {
  entryorguid: number | string;
  sourceType: number;
  rows: number;
  events: number;
  name: string | null;
  nameResolved: boolean;
  kind: string | null;
}

export interface SmartScriptRequest {
  /** Match creature / gameobject / quest names or the numeric entry. */
  search?: string;
  sourceType?: number;
  limit?: number;
}

export interface LookupRequest {
  entity: string;
  search?: string;
  ids?: (number | string)[];
  limit?: number;
}

export interface LookupItem {
  id: number | string;
  name: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Staged change ledger
// ---------------------------------------------------------------------------

export type ChangeKind = 'insert' | 'update' | 'delete';

export interface StagedChange {
  id: string;
  kind: ChangeKind;
  database: DatabaseName;
  table: string;
  /** Primary key (or unique key) values identifying the row. */
  key: Record<string, CellValue>;
  /** column -> { before, after } for updates & inserts. */
  values: Record<string, { before: CellValue; after: CellValue }>;
  /** Full row snapshot for inserts and deletes. */
  snapshot?: Row;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerState {
  changes: StagedChange[];
  updatedAt: string;
}

export interface StageRequest {
  /** Stable ledger identity when editing/deleting a staged insert, even when its key changes. */
  changeId?: string;
  kind: ChangeKind;
  database: DatabaseName;
  table: string;
  key: Record<string, CellValue>;
  values?: Record<string, { before: CellValue; after: CellValue }>;
  snapshot?: Row;
  note?: string;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export interface ExportRequest {
  /** Restrict the export to these change ids (defaults to everything staged). */
  changeIds?: string[];
  /** Content version folder, e.g. "3.4.3". */
  version?: string;
  /** Preview only — do not touch the filesystem. */
  dryRun?: boolean;
  /** Clear exported changes from the ledger afterwards. */
  clearAfterExport?: boolean;
  author?: string;
}

export interface ExportedFile {
  database: DatabaseName;
  path: string;
  relativePath: string;
  sql: string;
  changeCount: number;
  statementCount: number;
}

export interface ExportResult {
  files: ExportedFile[];
  dryRun: boolean;
  exportedAt: string;
}

export interface ApplyResult {
  applied: number;
  failed: { changeId: string; error: string }[];
}

export interface AppSettings {
  exportRoot: string;
  version: string;
  author: string;
  pageSize: number;
  profiles: ConnectionProfile[];
  activeProfileId: string | null;
  mode: ConnectionMode;
}

// ---------------------------------------------------------------------------
// API surface (identical over IPC and HTTP)
// ---------------------------------------------------------------------------

export interface WyrmrestApi {
  getIndex(): Promise<MetadataIndex>;
  getTable(database: DatabaseName, table: string): Promise<TableMeta>;
  getStatus(): Promise<ConnectionStatus>;
  connect(profile: ConnectionProfile): Promise<ConnectionStatus>;
  testConnection(profile: ConnectionProfile): Promise<ConnectionStatus>;
  useDemo(): Promise<ConnectionStatus>;
  disconnect(): Promise<ConnectionStatus>;
  query(request: QueryRequest): Promise<QueryResult>;
  lookup(request: LookupRequest): Promise<LookupItem[]>;
  /** Distinct SmartAI scripts, searchable by creature / object / quest name. */
  smartScripts(request: SmartScriptRequest): Promise<SmartScriptSummary[]>;
  /** Generated SmartAI definitions (events, actions, targets, parameters). */
  getSmartData(): Promise<SmartData>;
  resolveNames(entity: string, ids: (number | string)[]): Promise<Record<string, string>>;
  getLedger(): Promise<LedgerState>;
  stage(request: StageRequest): Promise<LedgerState>;
  revert(changeIds: string[]): Promise<LedgerState>;
  clearLedger(): Promise<LedgerState>;
  previewSql(changeIds?: string[]): Promise<string>;
  exportSql(request: ExportRequest): Promise<ExportResult>;
  applyToDatabase(changeIds?: string[]): Promise<ApplyResult>;
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
}
