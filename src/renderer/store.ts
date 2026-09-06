import { create } from 'zustand';
import { api } from './api';
import type {
  AppSettings,
  CatalogueEntry,
  CellValue,
  ConnectionStatus,
  DatabaseName,
  EntityMeta,
  FilterClause,
  LedgerState,
  MetadataIndex,
  QueryResult,
  Row,
  StagedChange,
  TableMeta,
} from '../shared/types';

export interface CellAddress {
  rowKey: string;
  column: string;
}

interface GridRow {
  key: string;
  row: Row;
  origin: 'db' | 'staged-insert';
  change: StagedChange | null;
}

interface State {
  ready: boolean;
  error: string | null;
  index: MetadataIndex | null;
  entities: Record<string, EntityMeta>;
  catalogue: CatalogueEntry[];
  status: ConnectionStatus | null;
  settings: AppSettings | null;

  database: DatabaseName;
  tableName: string | null;
  meta: TableMeta | null;
  result: QueryResult | null;
  /** Monotonic token for in-flight queries: late responses from a table the
   * user already navigated away from are discarded instead of painting stale
   * rows underneath the new table's columns. */
  queryToken: number;
  loading: boolean;
  queryError: string | null;

  search: string;
  filters: FilterClause[];
  orderBy: { column: string; direction: 'asc' | 'desc' }[];
  offset: number;

  ledger: StagedChange[];
  names: Record<string, Record<string, string>>;

  selected: CellAddress | null;
  editing: CellAddress | null;
  showDocs: boolean;
  showLedger: boolean;
  dialog: 'export' | 'connection' | 'palette' | null;
  toast: { kind: 'info' | 'error' | 'success'; message: string } | null;

  init(): Promise<void>;
  setDatabase(db: DatabaseName): void;
  openTable(database: DatabaseName, table: string): Promise<void>;
  refresh(): Promise<void>;
  setSearch(value: string): void;
  setFilters(filters: FilterClause[]): void;
  toggleSort(column: string): void;
  setOffset(offset: number): void;
  select(address: CellAddress | null): void;
  beginEdit(address: CellAddress | null): void;

  stageEdit(rowKey: string, column: string, value: CellValue): Promise<void>;
  addRow(): Promise<void>;
  deleteRow(rowKey: string): Promise<void>;
  /** Stage a copy of the selected (or a given) row as a new insert. */
  duplicateRow(rowKey?: string): Promise<void>;
  /** Remove every staged change for one row. */
  revertRow(rowKey: string): Promise<void>;
  /** Add a quick equality (or NULL / bit) filter from a cell value. */
  filterByCell(rowKey: string, column: string): Promise<void>;
  clearFilters(): void;
  revert(ids: string[]): Promise<void>;
  refreshLedger(): Promise<void>;
  applyToDatabase(ids?: string[]): Promise<void>;
  clearLedger(): Promise<void>;
  setDialog(dialog: State['dialog']): void;
  notify(kind: 'info' | 'error' | 'success', message: string): void;
  refreshStatus(): Promise<void>;
  saveSettings(patch: Partial<AppSettings>): Promise<void>;
  resolvePageNames(): Promise<void>;
}

/** Stable identity for a row: primary key values, or the whole row when a
 * table has no key at all (a handful of TrinityCore tables). */
export function rowKeyFor(meta: TableMeta, row: Row): string {
  const columns = meta.identityColumns.length ? meta.identityColumns : meta.columns.map((c) => c.name);
  return columns.map((c) => `${c}=${row[c] ?? 'NULL'}`).join('&');
}

export function keyValues(meta: TableMeta, row: Row): Record<string, CellValue> {
  const columns = meta.identityColumns.length ? meta.identityColumns : meta.columns.map((c) => c.name);
  const out: Record<string, CellValue> = {};
  for (const c of columns) out[c] = row[c] ?? null;
  return out;
}

function defaultRow(meta: TableMeta): Row {
  const row: Row = {};
  for (const col of meta.columns) {
    if (col.hasDefault && col.default !== null) {
      row[col.name] = col.kind === 'integer' || col.kind === 'float' ? Number(col.default) || 0 : col.default;
    } else if (col.nullable) row[col.name] = null;
    else if (col.kind === 'integer' || col.kind === 'float') row[col.name] = 0;
    else row[col.name] = '';
  }
  return row;
}

export const useStore = create<State>((set, get) => ({
  ready: false,
  error: null,
  index: null,
  entities: {},
  catalogue: [],
  status: null,
  settings: null,

  database: 'world',
  tableName: null,
  meta: null,
  result: null,
  queryToken: 0,
  loading: false,
  queryError: null,

  search: '',
  filters: [],
  orderBy: [],
  offset: 0,

  ledger: [],
  names: {},

  selected: null,
  editing: null,
  showDocs: true,
  showLedger: false,
  dialog: null,
  toast: null,

  async init() {
    try {
      const [index, status, settings, ledger] = await Promise.all([
        api.getIndex(),
        api.getStatus(),
        api.getSettings(),
        api.getLedger(),
      ]);
      set({
        index,
        entities: index.entities,
        catalogue: index.tables,
        status,
        settings,
        ledger: ledger.changes,
        ready: true,
      });
      await get().openTable('world', 'creature_template');
    } catch (err) {
      set({ error: (err as Error).message, ready: true });
    }
  },

  setDatabase(db) {
    set({ database: db });
  },

  async openTable(database, table) {
    set({
      database,
      tableName: table,
      // Drop the previous table's rows immediately: they do not line up with
      // the columns we are about to render.
      meta: null,
      result: null,
      loading: true,
      queryError: null,
      offset: 0,
      search: '',
      filters: [],
      orderBy: [],
      selected: null,
      editing: null,
    });
    const token = get().queryToken + 1;
    set({ queryToken: token });
    try {
      const meta = await api.getTable(database, table);
      if (get().queryToken !== token) return; // superseded by a newer request
      set({ meta });
      await get().refresh();
    } catch (err) {
      set({ queryError: (err as Error).message, loading: false, meta: null, result: null });
    }
  },

  async refresh() {
    const { database, tableName, search, filters, orderBy, offset, settings } = get();
    if (!tableName) return;
    const token = get().queryToken + 1;
    set({ loading: true, queryError: null, queryToken: token });
    try {
      const result = await api.query({
        database,
        table: tableName,
        search: search || undefined,
        filters,
        orderBy,
        offset,
        limit: settings?.pageSize ?? 100,
      });
      const state = get();
      if (state.queryToken !== token || state.database !== database || state.tableName !== tableName) {
        return; // a newer query is already in flight
      }
      set({ result, loading: false });
      void get().resolvePageNames();
    } catch (err) {
      if (get().queryToken !== token) return;
      set({ queryError: (err as Error).message, loading: false });
    }
  },

  setSearch(value) {
    set({ search: value, offset: 0 });
  },

  setFilters(filters) {
    set({ filters, offset: 0 });
    void get().refresh();
  },

  toggleSort(column) {
    const current = get().orderBy[0];
    const direction = current?.column === column && current.direction === 'asc' ? 'desc' : 'asc';
    set({ orderBy: [{ column, direction }], offset: 0 });
    void get().refresh();
  },

  setOffset(offset) {
    set({ offset: Math.max(0, offset) });
    void get().refresh();
  },

  select(address) {
    set({ selected: address, editing: null });
  },

  beginEdit(address) {
    set({ editing: address, selected: address ?? get().selected });
  },

  async stageEdit(rowKey, column, value) {
    const { meta, database, tableName } = get();
    if (!meta || !tableName) return;
    const grid = gridRows(get());
    const target = grid.find((r) => r.key === rowKey);
    if (!target) return;
    const before = target.change?.values[column]?.before ?? target.row[column] ?? null;
    if (String(before ?? '') === String(value ?? '')) {
      set({ editing: null });
      return;
    }
    try {
      const state = await api.stage({
        kind: target.origin === 'staged-insert' ? 'insert' : 'update',
        database,
        table: tableName,
        key: target.origin === 'staged-insert' ? target.change!.key : keyValues(meta, target.row),
        values: { [column]: { before, after: value } },
        snapshot: target.origin === 'staged-insert' ? { ...target.row, [column]: value } : undefined,
      });
      set({ ledger: state.changes, editing: null });
      void get().resolvePageNames();
    } catch (err) {
      get().notify('error', (err as Error).message);
    }
  },

  async addRow() {
    const { meta, database, tableName } = get();
    if (!meta || !tableName) return;
    if (meta.readOnly) {
      get().notify('error', `${meta.name} is read-only`);
      return;
    }
    const row = defaultRow(meta);
    // Give new rows a provisional key so several can be staged at once.
    const existing = get().ledger.filter((c) => c.table === tableName && c.kind === 'insert').length;
    const key: Record<string, CellValue> = {};
    for (const column of meta.identityColumns) {
      const col = meta.columns.find((c) => c.name === column)!;
      const value = col.kind === 'integer' ? Number(row[column] ?? 0) + existing + 1 : row[column] ?? '';
      key[column] = value;
      row[column] = value;
    }
    try {
      const state = await api.stage({
        kind: 'insert',
        database,
        table: tableName,
        key,
        values: Object.fromEntries(Object.entries(row).map(([k, v]) => [k, { before: null, after: v }])),
        snapshot: row,
        note: `New ${meta.label} row`,
      });
      set({ ledger: state.changes, showLedger: true });
      get().notify('success', 'New row staged — fill in its values, nothing is written yet.');
    } catch (err) {
      get().notify('error', (err as Error).message);
    }
  },

  async deleteRow(rowKey) {
    const { meta, database, tableName } = get();
    if (!meta || !tableName) return;
    const target = gridRows(get()).find((r) => r.key === rowKey);
    if (!target) return;
    try {
      const state = await api.stage({
        kind: 'delete',
        database,
        table: tableName,
        key: target.origin === 'staged-insert' ? target.change!.key : keyValues(meta, target.row),
        snapshot: target.row,
      });
      set({ ledger: state.changes });
    } catch (err) {
      get().notify('error', (err as Error).message);
    }
  },

  async duplicateRow(rowKey) {
    const { meta, database, tableName, selected } = get();
    if (!meta || !tableName) return;
    if (meta.readOnly) {
      get().notify('error', `${meta.label} is read-only`);
      return;
    }
    const targetKey = rowKey ?? selected?.rowKey;
    const target = gridRows(get()).find((r) => r.key === targetKey);
    if (!target) {
      get().notify('info', 'Select a row to duplicate first');
      return;
    }
    // Start from the row as currently shown (staged edits included).
    const values: Row = {};
    for (const col of meta.columns) values[col.name] = displayValue(target, col.name);

    // Nudge the identity so the copy does not collide with the source row:
    // auto-increment ids are left to the server (0), other key columns get a
    // one-up over the highest value already on this page.
    const insertCount = get().ledger.filter((c) => c.table === tableName && c.kind === 'insert').length;
    const key: Record<string, CellValue> = {};
    for (const column of meta.identityColumns) {
      const col = meta.columns.find((c) => c.name === column)!;
      if (col.autoIncrement) {
        key[column] = 0;
        values[column] = 0;
      } else if (col.kind === 'integer' || col.kind === 'float') {
        const pageValues = gridRows(get())
          .map((r) => Number(displayValue(r, column)))
          .filter((n) => Number.isFinite(n));
        const next = (pageValues.length ? Math.max(...pageValues) : 0) + insertCount + 1;
        key[column] = next;
        values[column] = next;
      } else {
        const base = String(values[column] ?? '');
        const copy = `${base} copy`;
        key[column] = copy;
        values[column] = copy;
      }
    }

    try {
      const state = await api.stage({
        kind: 'insert',
        database,
        table: tableName,
        key,
        values: Object.fromEntries(
          meta.columns.map((c) => [c.name, { before: null, after: values[c.name] ?? null }]),
        ),
        snapshot: values,
        note: `Duplicated ${meta.label} row`,
      });
      set({ ledger: state.changes, showLedger: true });
      get().notify('success', 'Copy staged as a new row — adjust its key, nothing is written yet.');
    } catch (err) {
      get().notify('error', (err as Error).message);
    }
  },

  async revertRow(rowKey) {
    const { database, tableName } = get();
    const target = gridRows(get()).find((r) => r.key === rowKey);
    const ids: string[] = [];
    if (target?.change) ids.push(target.change.id);
    // A staged insert can also be hiding the change for its provisional key.
    for (const change of get().ledger) {
      if (change.database !== database || change.table !== tableName) continue;
      const k = Object.entries(change.key)
        .map(([k2, v]) => `${k2}=${v ?? 'NULL'}`)
        .join('&');
      if (k === rowKey && !ids.includes(change.id)) ids.push(change.id);
    }
    if (!ids.length) return;
    const state = await api.revert(ids);
    set({ ledger: state.changes });
    void get().refresh();
  },

  async filterByCell(rowKey, column) {
    const { meta, filters } = get();
    if (!meta) return;
    const target = gridRows(get()).find((r) => r.key === rowKey);
    if (!target) return;
    const value = displayValue(target, column);
    const clause: FilterClause =
      value === null || value === undefined || value === ''
        ? { column, op: 'isNull' }
        : { column, op: '=', value };
    // Replace an existing quick-filter on the same column rather than stacking.
    const next = filters.filter((f) => f.column !== column);
    next.push(clause);
    set({ filters: next, offset: 0 });
    void get().refresh();
    get().notify('info', `Filtered by ${column}${value === null || value === undefined ? ' IS NULL' : ` = ${value}`}`);
  },

  clearFilters() {
    if (!get().filters.length) return;
    set({ filters: [], offset: 0 });
    void get().refresh();
  },

  async revert(ids) {
    const state = await api.revert(ids);
    set({ ledger: state.changes });
    void get().refresh();
  },

  async refreshLedger() {
    const state = await api.getLedger();
    set({ ledger: state.changes });
  },

  async applyToDatabase(ids) {
    try {
      const result = await api.applyToDatabase(ids);
      await get().refreshLedger();
      void get().refresh();
      if (result.failed.length) {
        get().notify('error', `${result.applied} applied, ${result.failed.length} failed: ${result.failed[0].error}`);
      } else {
        get().notify('success', `Applied ${result.applied} change${result.applied === 1 ? '' : 's'} to the server`);
      }
    } catch (err) {
      get().notify('error', (err as Error).message);
    }
  },

  async clearLedger() {
    const state = await api.clearLedger();
    set({ ledger: state.changes });
    void get().refresh();
  },

  setDialog(dialog) {
    set({ dialog });
  },

  notify(kind, message) {
    set({ toast: { kind, message } });
    setTimeout(() => {
      if (get().toast?.message === message) set({ toast: null });
    }, 6000);
  },

  async refreshStatus() {
    const status = await api.getStatus();
    set({ status });
  },

  async saveSettings(patch) {
    const settings = await api.saveSettings(patch);
    set({ settings });
  },

  async resolvePageNames() {
    const { meta, result, names } = get();
    if (!meta || !result) return;
    const wanted = new Map<string, Set<string>>();
    for (const column of meta.columns) {
      const entity = column.reference?.entity;
      if (!entity || column.reference?.self) continue;
      for (const row of result.rows) {
        const value = row[column.name];
        if (value === null || value === undefined || value === '' || Number(value) <= 0) continue;
        const known = names[entity]?.[String(value)];
        if (known !== undefined) continue;
        const set0 = wanted.get(entity) ?? new Set<string>();
        set0.add(String(value));
        wanted.set(entity, set0);
      }
    }
    if (!wanted.size) return;
    const merged: Record<string, Record<string, string>> = { ...names };
    await Promise.all(
      [...wanted.entries()].map(async ([entity, ids]) => {
        try {
          const resolved = await api.resolveNames(entity, [...ids].slice(0, 200));
          merged[entity] = { ...(merged[entity] ?? {}), ...resolved };
          // Remember misses so we do not ask again for every repaint.
          for (const id of ids) merged[entity][id] ??= '';
        } catch {
          /* lookups are best effort */
        }
      }),
    );
    set({ names: merged });
  },
}));

/** Grid rows = staged inserts for this table first, then the fetched page. */
export function gridRows(state: Pick<State, 'meta' | 'result' | 'ledger' | 'database' | 'tableName'>): GridRow[] {
  const { meta, result, ledger, database, tableName } = state;
  if (!meta || !tableName) return [];
  const relevant = ledger.filter((c) => c.database === database && c.table === tableName);
  const inserts = relevant.filter((c) => c.kind === 'insert');
  const byKey = new Map<string, StagedChange>();
  for (const change of relevant) {
    byKey.set(
      Object.entries(change.key)
        .map(([k, v]) => `${k}=${v ?? 'NULL'}`)
        .join('&'),
      change,
    );
  }

  const rows: GridRow[] = inserts.map((change) => ({
    key: Object.entries(change.key)
      .map(([k, v]) => `${k}=${v ?? 'NULL'}`)
      .join('&'),
    row: change.snapshot ?? {},
    origin: 'staged-insert',
    change,
  }));

  for (const row of result?.rows ?? []) {
    const key = rowKeyFor(meta, row);
    const change = byKey.get(key) ?? null;
    if (change?.kind === 'insert') continue;
    rows.push({ key, row, origin: 'db', change });
  }
  return rows;
}

/** Value shown in a cell: the staged value when one exists. */
export function displayValue(gridRow: GridRow, column: string): CellValue {
  const staged = gridRow.change?.values?.[column];
  if (staged) return staged.after;
  return gridRow.row[column] ?? null;
}

export type { GridRow };
