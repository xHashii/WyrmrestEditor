import { create } from 'zustand';
import { api } from './api';
import { defaultRow, identityKey, insertKey, integerValue, keyValues, parseCellValue, sameValue, valueText } from '../shared/values';
import type {
  AppSettings, CatalogueEntry, CellValue, ConnectionStatus, DatabaseName, EntityMeta, FilterClause,
  LedgerState, MetadataIndex, QueryResult, Row, StagedChange, TableMeta,
} from '../shared/types';

export interface CellAddress { rowKey: string; column: string }
export interface GridRow { key: string; row: Row; origin: 'db' | 'staged-insert'; change: StagedChange | null; ambiguous?: boolean }

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
  navigationToken: number;
  queryToken: number;
  sourceToken: number;
  loading: boolean;
  queryError: string | null;
  editError: string | null;
  search: string;
  filters: FilterClause[];
  orderBy: { column: string; direction: 'asc' | 'desc' }[];
  offset: number;
  ledger: StagedChange[];
  ledgerUpdatedAt: string;
  pendingMutations: number;
  names: Record<string, Record<string, string>>;
  selected: CellAddress | null;
  editing: CellAddress | null;
  showSidebar: boolean;
  showDocs: boolean;
  showLedger: boolean;
  lastTables: Partial<Record<DatabaseName, string>>;
  dialog: 'export' | 'connection' | 'palette' | null;
  exportIds: string[] | undefined;
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
  stageEdit(rowKey: string, column: string, value: CellValue): Promise<boolean>;
  addRow(): Promise<void>;
  deleteRow(rowKey: string): Promise<void>;
  duplicateRow(rowKey?: string): Promise<void>;
  revertRow(rowKey: string): Promise<void>;
  filterByCell(rowKey: string, column: string): Promise<void>;
  clearFilters(): void;
  revert(ids: string[]): Promise<void>;
  refreshLedger(): Promise<void>;
  applyToDatabase(ids?: string[]): Promise<void>;
  clearLedger(): Promise<void>;
  setDialog(dialog: State['dialog']): void;
  notify(kind: 'info' | 'error' | 'success', message: string): void;
  refreshStatus(): Promise<void>;
  connectionChanged(status: ConnectionStatus): Promise<void>;
  saveSettings(patch: Partial<AppSettings>): Promise<void>;
  resolvePageNames(): Promise<void>;
}

export { keyValues } from '../shared/values';
export const rowKeyFor = (meta: TableMeta, row: Row): string => identityKey(keyValues(meta, row));
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let initialization: Promise<void> | null = null;

function acceptLedger(state: LedgerState) {
  if (state.updatedAt >= useStore.getState().ledgerUpdatedAt) {
    useStore.setState({ ledger: state.changes, ledgerUpdatedAt: state.updatedAt });
  }
}

async function mutation<T>(task: () => Promise<T>): Promise<T> {
  useStore.setState((s) => ({ pendingMutations: s.pendingMutations + 1 }));
  try { return await task(); }
  finally { useStore.setState((s) => ({ pendingMutations: s.pendingMutations - 1 })); }
}

/** Pick a proposed key from the whole source, not just the visible page. Only
 * one component of a composite identity changes; auto IDs remain server-owned.
 * The service checks again for collisions before accepting an insert. */
async function proposeKey(meta: TableMeta, row: Row): Promise<Row> {
  const next = { ...row };
  if (meta.autoIncrementColumn) {
    next[meta.autoIncrementColumn] = null;
    return next;
  }
  const candidates = meta.identityColumns.map((name) => meta.columns.find((c) => c.name === name)!);
  const column = candidates.find((c) => c.kind === 'integer' && /^(id|entry|guid)$/i.test(c.name)) ??
    candidates.find((c) => c.kind === 'integer') ?? candidates[0];
  if (!column) return next;
  if (column.kind === 'integer') {
    const highest = await api.query({ database: meta.database, table: meta.name, limit: 1,
      orderBy: [{ column: column.name, direction: 'desc' }] });
    const pending = useStore.getState().ledger.filter((c) => c.database === meta.database && c.table === meta.name && c.kind === 'insert');
    const values = [next[column.name], highest.rows[0]?.[column.name], ...pending.map((c) => c.snapshot?.[column.name])];
    let maximum = 0n;
    for (const value of values) {
      if (value != null && /^-?\d+$/.test(String(value))) {
        const integer = BigInt(String(value));
        if (integer > maximum) maximum = integer;
      }
    }
    next[column.name] = parseCellValue(column, integerValue(maximum + 1n));
  } else {
    const count = useStore.getState().ledger.filter((c) => c.database === meta.database && c.table === meta.name && c.kind === 'insert').length;
    const suffix = ` copy${count ? ` ${count + 1}` : ''}`;
    next[column.name] = `${String(row[column.name] ?? '').slice(0, Math.max(0, (column.length ?? 255) - suffix.length))}${suffix}`;
  }
  return next;
}

async function stageNewRow(meta: TableMeta, values: Row, note: string) {
  const before = new Set(useStore.getState().ledger.map((c) => c.id));
  const state = await api.stage({ kind: 'insert', database: meta.database, table: meta.name, key: insertKey(meta, values),
    values: Object.fromEntries(Object.entries(values).map(([key, after]) => [key, { before: null, after }])), snapshot: values, note });
  acceptLedger(state);
  const created = state.changes.find((c) => !before.has(c.id));
  const current = useStore.getState();
  if (created && current.database === meta.database && current.tableName === meta.name) {
    current.select({ rowKey: `insert:${created.id}`, column: meta.identityColumns[0] ?? meta.columns[0].name });
  }
  current.notify('success', 'New row staged. Review its key and values before exporting; nothing has been written to the database.');
}

export const useStore = create<State>((set, get) => ({
  ready: false, error: null, index: null, entities: {}, catalogue: [], status: null, settings: null,
  database: 'world', tableName: null, meta: null, result: null,
  navigationToken: 0, queryToken: 0, sourceToken: 0, loading: false, queryError: null, editError: null,
  search: '', filters: [], orderBy: [], offset: 0,
  ledger: [], ledgerUpdatedAt: '', pendingMutations: 0, names: {}, selected: null, editing: null,
  showSidebar: true, showDocs: true, showLedger: false, lastTables: {}, dialog: null, exportIds: undefined, toast: null,

  async init() {
    if (initialization) return initialization;
    set({ error: null, ready: false });
    initialization = (async () => {
      try {
        const [index, status, settings, ledger] = await Promise.all([api.getIndex(), api.getStatus(), api.getSettings(), api.getLedger()]);
        set({ index, entities: index.entities, catalogue: index.tables, status, settings, ledger: ledger.changes,
          ledgerUpdatedAt: ledger.updatedAt, ready: true });
        await get().openTable('world', 'creature_template');
      } catch (err) {
        set({ error: (err as Error).message, ready: true });
      }
    })();
    try { await initialization; } finally { initialization = null; }
  },

  setDatabase(database) {
    if (database === get().database) return;
    const defaults: Record<DatabaseName, string> = { world: 'creature_template', auth: 'account', characters: 'characters', hotfixes: 'item_sparse' };
    void get().openTable(database, get().lastTables[database] ?? defaults[database]);
  },

  async openTable(database, tableName) {
    clearTimeout(searchTimer);
    const token = get().navigationToken + 1;
    set({ database, tableName, meta: null, result: null, loading: true, queryError: null, editError: null,
      navigationToken: token, queryToken: get().queryToken + 1, offset: 0, search: '', filters: [], orderBy: [], selected: null, editing: null,
      lastTables: { ...get().lastTables, [database]: tableName } });
    try {
      const meta = await api.getTable(database, tableName);
      if (get().navigationToken !== token) return;
      set({ meta });
      await get().refresh();
    } catch (err) {
      if (get().navigationToken !== token) return;
      set({ queryError: (err as Error).message, loading: false, meta: null, result: null });
    }
  },

  async refresh() {
    clearTimeout(searchTimer);
    const { meta, database, tableName, search, filters, orderBy, offset, settings } = get();
    // Do not invalidate a metadata request while a table is still opening.
    if (!meta || !tableName || meta.database !== database || meta.name !== tableName) return;
    const token = get().queryToken + 1;
    set({ loading: true, queryError: null, queryToken: token });
    try {
      const result = await api.query({ database, table: tableName, search: search || undefined, filters, orderBy, offset, limit: settings?.pageSize ?? 100 });
      if (get().queryToken !== token) return;
      if (result.total !== null && offset > 0 && !result.rows.length) {
        set({ offset: Math.max(0, Math.ceil(result.total / result.limit) - 1) * result.limit });
        await get().refresh();
        return;
      }
      set({ result, loading: false });
      const selected = get().selected;
      if (selected && !gridRows(get()).some((r) => r.key === selected.rowKey)) set({ selected: null, editing: null, editError: null });
      void get().resolvePageNames();
    } catch (err) {
      if (get().queryToken !== token) return;
      set({ queryError: (err as Error).message, loading: false });
    }
  },

  setSearch(search) {
    clearTimeout(searchTimer);
    set({ search, offset: 0, loading: Boolean(get().meta), queryToken: get().queryToken + 1 });
    searchTimer = setTimeout(() => void get().refresh(), 250);
  },
  setFilters(filters) { set({ filters, offset: 0 }); void get().refresh(); },
  toggleSort(column) {
    const current = get().orderBy[0];
    set({ orderBy: [{ column, direction: current?.column === column && current.direction === 'asc' ? 'desc' : 'asc' }], offset: 0 });
    void get().refresh();
  },
  setOffset(offset) { set({ offset: Math.max(0, offset), selected: null, editing: null, editError: null }); void get().refresh(); },
  select(selected) { set({ selected, editing: null, editError: null }); },
  beginEdit(editing) {
    if (editing) {
      const row = gridRows(get()).find((r) => r.key === editing.rowKey);
      if (get().meta?.readOnly || row?.change?.kind === 'delete' || row?.ambiguous) return;
    }
    set({ editing, selected: editing ?? get().selected, editError: null });
  },

  async stageEdit(rowKey, column, value) {
    const { meta, database, tableName, editing, editError } = get();
    if (!meta || !tableName || meta.readOnly) return false;
    const target = gridRows(get()).find((r) => r.key === rowKey);
    if (!target || target.change?.kind === 'delete' || target.ambiguous) return false;
    try {
      const columnMeta = meta.columns.find((c) => c.name === column);
      if (!columnMeta) throw new Error(`Unknown column ${column}`);
      const after = parseCellValue(columnMeta, value);
      // Compare with what is displayed, not the original, so an edit back to
      // the original actually reaches the ledger and cancels the delta.
      if (!sameValue(displayValue(target, column), after)) {
        await mutation(async () => {
          const snapshot = target.origin === 'staged-insert' ? { ...target.row, [column]: after } : undefined;
          const state = await api.stage({
            changeId: target.change?.id, kind: target.origin === 'staged-insert' ? 'insert' : 'update', database, table: tableName,
            key: snapshot ? insertKey(meta, snapshot) : keyValues(meta, target.row),
            values: { [column]: { before: target.change?.values[column] ? target.change.values[column].before : target.row[column] ?? null, after } }, snapshot,
          });
          acceptLedger(state);
        });
      }
      if (get().editing === editing) set({ editing: null, editError: null });
      if (editError && get().toast?.message === editError) set({ toast: null });
      void get().resolvePageNames();
      return true;
    } catch (err) {
      if (get().database === database && get().tableName === tableName) set({ editError: (err as Error).message });
      get().notify('error', (err as Error).message);
      return false;
    }
  },

  async addRow() {
    const { meta, pendingMutations } = get();
    if (!meta || meta.readOnly || pendingMutations) return;
    try { await mutation(async () => stageNewRow(meta, await proposeKey(meta, defaultRow(meta)), `New ${meta.label} row`)); }
    catch (err) { get().notify('error', (err as Error).message); }
  },
  async duplicateRow(rowKey) {
    const { meta, pendingMutations, selected } = get();
    if (!meta || meta.readOnly || pendingMutations) return;
    const target = gridRows(get()).find((r) => r.key === (rowKey ?? selected?.rowKey));
    if (!target) { get().notify('info', 'Select a row to duplicate first.'); return; }
    const values = Object.fromEntries(meta.columns.map((c) => [c.name, displayValue(target, c.name)]));
    try { await mutation(async () => stageNewRow(meta, await proposeKey(meta, values), `Duplicated ${meta.label} row`)); }
    catch (err) { get().notify('error', (err as Error).message); }
  },
  async deleteRow(rowKey) {
    const { meta, pendingMutations } = get();
    if (!meta || meta.readOnly || pendingMutations) return;
    const target = gridRows(get()).find((r) => r.key === rowKey);
    if (!target || target.change?.kind === 'delete' || target.ambiguous) return;
    try {
      await mutation(async () => acceptLedger(await api.stage({ changeId: target.change?.id, kind: 'delete', database: meta.database,
        table: meta.name, key: target.origin === 'staged-insert' ? target.change!.key : keyValues(meta, target.row), snapshot: target.row })));
      if (target.origin === 'staged-insert') get().select(null);
      get().notify('info', target.origin === 'staged-insert' ? 'New row removed.' : 'Deletion staged, not applied. Use Revert row to keep it.');
    } catch (err) { get().notify('error', (err as Error).message); }
  },
  async revertRow(rowKey) {
    const change = gridRows(get()).find((r) => r.key === rowKey)?.change;
    if (change) await get().revert([change.id]);
  },
  async filterByCell(rowKey, column) {
    const target = gridRows(get()).find((r) => r.key === rowKey);
    if (!target) return;
    const value = displayValue(target, column);
    const clause: FilterClause = value == null ? { column, op: 'isNull' } : { column, op: '=', value };
    get().setFilters([...get().filters.filter((f) => f.column !== column), clause]);
    get().notify('info', `Filtered by ${column} ${value == null ? 'IS NULL' : `= ${valueText(value)}`}`);
  },
  clearFilters() { get().setFilters([]); },
  async revert(ids) {
    try {
      await mutation(async () => acceptLedger(await api.revert(ids)));
      await get().refresh();
    } catch (err) { get().notify('error', (err as Error).message); }
  },
  async refreshLedger() { acceptLedger(await api.getLedger()); },
  async applyToDatabase(ids) {
    try {
      await mutation(async () => {
        const result = await api.applyToDatabase(ids);
        await get().refreshLedger();
        await get().refresh();
        get().notify(result.failed.length ? 'error' : 'success', result.failed.length
          ? `${result.applied} applied, ${result.failed.length} failed. Unapplied changes are still staged. ${result.failed.map((f) => f.error).join('; ')}`
          : `Applied ${result.applied} change${result.applied === 1 ? '' : 's'} to the server.`);
      });
    } catch (err) { get().notify('error', (err as Error).message); }
  },
  async clearLedger() {
    try {
      await mutation(async () => acceptLedger(await api.clearLedger()));
      await get().refresh();
    } catch (err) { get().notify('error', (err as Error).message); }
  },
  setDialog(dialog) { set({ dialog, exportIds: undefined, editing: null, editError: null }); },
  notify(kind, message) {
    clearTimeout(toastTimer);
    set({ toast: { kind, message } });
    // Errors stay readable until dismissed instead of disappearing mid-review.
    if (kind !== 'error') toastTimer = setTimeout(() => set({ toast: null }), 6500);
  },
  async refreshStatus() {
    try { set({ status: await api.getStatus() }); }
    catch (err) { get().notify('error', (err as Error).message); }
  },
  async connectionChanged(status) {
    set({ status, sourceToken: get().sourceToken + 1, queryToken: get().queryToken + 1, names: {}, result: null, selected: null, editing: null });
    const settings = await api.getSettings();
    set({ settings });
    await get().refresh();
  },
  async saveSettings(patch) {
    const settings = await api.saveSettings(patch);
    set({ settings });
    if (patch.pageSize !== undefined) get().setOffset(0);
  },
  async resolvePageNames() {
    const { meta, sourceToken } = get();
    if (!meta) return;
    const wanted = new Map<string, Set<string>>();
    const rows = gridRows(get());
    for (const column of meta.columns) {
      const entity = column.reference?.entity;
      if (!entity || column.reference?.self) continue;
      for (const row of rows) {
        const value = displayValue(row, column.name);
        if (value == null || value === '' || Number(value) <= 0 || get().names[entity]?.[String(value)] !== undefined) continue;
        const ids = wanted.get(entity) ?? new Set<string>();
        ids.add(String(value));
        wanted.set(entity, ids);
      }
    }
    await Promise.all([...wanted].map(async ([entity, ids]) => {
      const all = [...ids];
      for (let start = 0; start < all.length; start += 200) {
        const batch = all.slice(start, start + 200);
        try {
          const names = await api.resolveNames(entity, batch);
          if (get().sourceToken !== sourceToken) return;
          for (const id of batch) names[id] ??= '';
          set((s) => ({ names: { ...s.names, [entity]: { ...s.names[entity], ...names } } }));
        } catch { /* Name lookup is optional; raw IDs remain usable. */ }
      }
    }));
  },
}));

/** Staged rows keep their own stable UI identity while their SQL key is edited. */
export function gridRows(state: Pick<State, 'meta' | 'result' | 'ledger' | 'database' | 'tableName'>): GridRow[] {
  const { meta, result, ledger, database, tableName } = state;
  if (!meta || !tableName || meta.database !== database || meta.name !== tableName) return [];
  const relevant = ledger.filter((c) => c.database === database && c.table === tableName);
  const byKey = new Map(relevant.filter((c) => c.kind !== 'insert').map((c) => [identityKey(c.key), c]));
  const keyCounts = new Map<string, number>();
  for (const row of result?.rows ?? []) { const key = rowKeyFor(meta, row); keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1); }
  return [
    ...relevant.filter((c) => c.kind === 'insert').map((change): GridRow => ({ key: `insert:${change.id}`, row: change.snapshot ?? {}, origin: 'staged-insert', change })),
    ...(result?.rows ?? []).map((row, index): GridRow => {
      const key = rowKeyFor(meta, row);
      const ambiguous = !meta.identityColumns.length && keyCounts.get(key)! > 1;
      return { key: ambiguous ? `${key}:duplicate:${index}` : key, row, origin: 'db', ambiguous, change: ambiguous ? null : byKey.get(key) ?? null };
    }),
  ];
}

export function displayValue(gridRow: GridRow, column: string): CellValue {
  return gridRow.change?.values?.[column] ? gridRow.change.values[column].after : gridRow.row[column] ?? null;
}
