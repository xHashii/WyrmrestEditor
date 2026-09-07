import { DemoDataSource, MySqlDataSource, type DataSource } from './datasource.js';
import { Ledger } from './ledger.js';
import { entityMeta, metadataIndex, tableMeta } from './metadata.js';
import { exportChanges, renderChanges } from './export.js';
import { loadSettings, saveSettings } from './settings.js';
import { renderChange } from './sql.js';
import { insertKey, parseCellValue } from '../shared/values.js';
import type {
  ApplyResult,
  AppSettings,
  ConnectionProfile,
  ConnectionStatus,
  DatabaseName,
  ExportRequest,
  ExportResult,
  LedgerState,
  LookupItem,
  LookupRequest,
  MetadataIndex,
  QueryRequest,
  QueryResult,
  StageRequest,
  TableMeta,
  WyrmrestApi,
} from '../shared/types.js';
import { DATABASES } from '../shared/types.js';

/**
 * The application service — one object implementing the whole API surface.
 * Electron's main process and the dev HTTP server both just forward to it.
 */
export class WyrmrestService implements WyrmrestApi {
  private source: DataSource = new DemoDataSource();
  private readonly ledger = new Ledger();
  private settings: AppSettings = loadSettings();
  private startupWarning: string | null = null;
  private pending: Promise<unknown> = Promise.resolve();

  /** Serialize destructive operations so a slow apply cannot erase a newer edit
   * or race a connection switch. Queries and connection probes stay independent. */
  private mutate<T>(action: () => T | Promise<T>): Promise<T> {
    const next = this.pending.then(action);
    this.pending = next.catch(() => undefined);
    return next;
  }

  async getIndex(): Promise<MetadataIndex> {
    return metadataIndex();
  }

  async getTable(database: DatabaseName, table: string): Promise<TableMeta> {
    return tableMeta(database, table);
  }

  async getStatus(): Promise<ConnectionStatus> {
    return { ...this.source.status(), ...(this.startupWarning ? { warning: this.startupWarning } : {}) };
  }

  /**
   * Try a profile without making it active. Never touches `this.source`, so a
   * failed (or successful) probe leaves the running session untouched.
   */
  async testConnection(profile: ConnectionProfile): Promise<ConnectionStatus> {
    try {
      validateProfile(profile);
      return await MySqlDataSource.probe(profile);
    } catch (err) {
      const message = (err as Error).message;
      // Report every configured schema as unavailable (rather than leaking
      // demo-mode "available" pills) so the dialog shows what failed.
      const databases: ConnectionStatus['databases'] = {};
      for (const db of DATABASES) {
        databases[db] = profile?.databases?.[db]
          ? { available: false, tables: 0, error: message }
          : { available: false, tables: 0, error: 'not configured' };
      }
      return {
        mode: 'live',
        connected: false,
        profile: profile ? { id: profile.id, name: profile.name, host: profile.host, port: profile.port, user: profile.user, databases: profile.databases } : null,
        serverVersion: null,
        message: `Could not connect: ${message}`,
        databases,
      };
    }
  }

  async connect(profile: ConnectionProfile): Promise<ConnectionStatus> {
    return this.mutate(async () => {
      validateProfile(profile);
      // A failed attempt must never disconnect a working server.
      const next = await MySqlDataSource.connect(profile);
      try {
        const profiles = this.settings.profiles.filter((p) => p.id !== profile.id);
        profiles.push({ ...profile, password: profile.rememberPassword ? profile.password : '' });
        this.settings = saveSettings({ profiles, activeProfileId: profile.id, mode: 'live' });
      } catch (err) {
        await next.close();
        throw err;
      }
      const previous = this.source;
      this.source = next;
      this.startupWarning = null;
      await previous.close();
      return this.source.status();
    });
  }

  async useDemo(): Promise<ConnectionStatus> {
    return this.mutate(async () => {
      this.settings = saveSettings({ mode: 'demo', activeProfileId: null });
      await this.source.close();
      this.source = new DemoDataSource();
      this.startupWarning = null;
      return this.source.status();
    });
  }

  async disconnect(): Promise<ConnectionStatus> {
    return this.useDemo();
  }

  async query(request: QueryRequest): Promise<QueryResult> {
    const result = await this.source.query(request);
    return result;
  }

  async lookup(request: LookupRequest): Promise<LookupItem[]> {
    const entity = entityMeta(request.entity);
    return this.source.lookup(entity.database, entity.table, entity.idColumn, entity.nameColumns, {
      search: request.search,
      ids: request.ids,
      limit: request.limit,
    });
  }

  async resolveNames(entity: string, ids: (number | string)[]): Promise<Record<string, string>> {
    if (!ids.length) return {};
    const unique = [...new Set(ids.map((id) => String(id)))].slice(0, 200);
    const items = await this.lookup({ entity, ids: unique, limit: unique.length });
    const out: Record<string, string> = {};
    for (const item of items) out[String(item.id)] = item.name;
    return out;
  }

  async getLedger(): Promise<LedgerState> {
    return this.ledger.get();
  }

  async stage(request: StageRequest): Promise<LedgerState> {
    return this.mutate(async () => {
      const meta = tableMeta(request.database, request.table);
      if (meta.readOnly) throw new Error(`${meta.name} is read-only`);
      if (!['insert', 'update', 'delete'].includes(request.kind)) throw new Error('Unknown change kind');
      if (!request.key || typeof request.key !== 'object' || Array.isArray(request.key)) throw new Error('Missing row key');
      const normalized = structuredClone(request);
      const columnFor = (name: string) => {
        const column = meta.columns.find((c) => c.name === name);
        if (!column) throw new Error(`Unknown column ${meta.name}.${name}`);
        return column;
      };
      for (const [name, value] of Object.entries(normalized.key)) parseCellValue(columnFor(name), value);
      for (const [name, delta] of Object.entries(normalized.values ?? {})) {
        if (!delta || !Object.hasOwn(delta, 'after')) throw new Error(`Missing value for ${name}`);
        const column = columnFor(name);
        if (request.kind === 'update' && delta.after === null && !column.nullable) throw new Error(`${name} cannot be NULL.`);
        delta.after = parseCellValue(column, delta.after);
      }
      if (request.kind === 'insert') {
        const existing = request.changeId ? this.ledger.find(request.changeId) : undefined;
        if (existing?.kind === 'insert') normalized.snapshot = { ...existing.snapshot };
        if (!normalized.snapshot) throw new Error('An inserted row needs a snapshot');
        for (const [name, value] of Object.entries(normalized.snapshot)) {
          normalized.snapshot[name] = parseCellValue(columnFor(name), value);
        }
        for (const [name, delta] of Object.entries(normalized.values ?? {})) normalized.snapshot[name] = delta.after;
        normalized.key = insertKey(meta, normalized.snapshot);
        // A new row must not silently replace a real row via export's DELETE.
        if (Object.keys(normalized.key).length) {
          const found = await this.source.query({ database: meta.database, table: meta.name, limit: 1,
            filters: Object.entries(normalized.key).map(([column, value]) => ({ column, op: '=', value })) });
          if (found.rows.length) throw new Error('This key already exists in the database. Choose a different key.');
        }
      } else if (!normalized.changeId || this.ledger.find(normalized.changeId)?.kind !== 'insert') {
        const required = meta.identityColumns.length ? meta.identityColumns : meta.columns.map((c) => c.name);
        if (required.some((name) => !Object.hasOwn(normalized.key, name))) throw new Error('All row key columns are required.');
        if (!meta.identityColumns.length) {
          const matches = await this.source.query({ database: meta.database, table: meta.name, limit: 2,
            filters: Object.entries(normalized.key).map(([column, value]) => value === null ? { column, op: 'isNull' } : { column, op: '=', value }) });
          if (matches.rows.length > 1) throw new Error('Identical rows without a unique key cannot be edited or deleted safely.');
        }
      }
      // The renderer overlays the ledger on immutable source rows. Mutating demo
      // rows here made Refresh/Revert/Discard permanently retain staged edits.
      return this.ledger.stage(normalized);
    });
  }

  async revert(changeIds: string[]): Promise<LedgerState> {
    return this.mutate(() => this.ledger.revert(changeIds));
  }

  async clearLedger(): Promise<LedgerState> {
    return this.mutate(() => this.ledger.clear());
  }

  async previewSql(changeIds?: string[]): Promise<string> {
    const changes = this.ledger.select(changeIds);
    if (!changes.length) return '-- nothing staged';
    const byDatabase = new Map<DatabaseName, typeof changes>();
    for (const change of changes) {
      const list = byDatabase.get(change.database) ?? [];
      list.push(change);
      byDatabase.set(change.database, list);
    }
    return [...byDatabase.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([database, list]) => renderChanges(database, list, this.settings.version, this.settings.author).sql)
      .join('\n');
  }

  async exportSql(request: ExportRequest): Promise<ExportResult> {
    return this.mutate(() => {
      const changes = this.ledger.select(request.changeIds);
      if (!changes.length) throw new Error('nothing staged to export');
      const result = exportChanges(changes, {
        ...request,
        root: this.settings.exportRoot,
        version: request.version ?? this.settings.version,
        author: request.author ?? this.settings.author,
    });
    if (!request.dryRun && request.clearAfterExport) {
      this.ledger.revert(changes.map((c) => c.id));
    }
    return result;
    });
  }

  async applyToDatabase(changeIds?: string[]): Promise<ApplyResult> {
    return this.mutate(async () => {
      if (this.source.mode !== 'live') throw new Error('Connect to a live database before applying changes.');
      const changes = this.ledger.select(changeIds);
      const failed: ApplyResult['failed'] = [];
      let applied = 0;
      for (const change of changes) {
        try {
          const meta = tableMeta(change.database, change.table);
          await this.source.executeBatch(change.database, meta.name, renderChange(meta, change));
        } catch (err) {
          failed.push({ changeId: change.id, error: (err as Error).message });
          continue;
        }
        applied++;
        try {
          this.ledger.revert([change.id]);
        } catch (err) {
          // SQL has already committed. Do not label this an unapplied change or
          // continue applying rows when we can no longer save ledger progress.
          throw new Error(`${applied} change(s) were applied to the server, but the ledger could not be updated: ${(err as Error).message}. Stop and verify the server before applying again. ${change.database}.${change.table} (${change.id}) is still listed locally.`);
        }
      }
      return { applied, failed };
    });
  }

  async getSettings(): Promise<AppSettings> {
    return structuredClone(this.settings);
  }

  async saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    return this.mutate(() => {
      const safePatch = structuredClone(patch);
      if (safePatch.profiles) safePatch.profiles = safePatch.profiles.map((p) => ({ ...p, password: p.rememberPassword ? p.password : '' }));
      this.settings = saveSettings(safePatch);
      return structuredClone(this.settings);
    });
  }

  /** Reconnect using the stored profile, used at startup. */
  async restore(): Promise<ConnectionStatus> {
    const profile = this.settings.profiles.find((p) => p.id === this.settings.activeProfileId);
    if (this.settings.mode === 'live' && profile) {
      try { return await this.connect(profile); }
      catch (err) { this.startupWarning = `Could not reconnect to ${profile.name}: ${(err as Error).message}. Open connection settings to retry or enter a session-only password. Showing sample data, not server rows.`; }
    }
    return this.getStatus();
  }

  async shutdown(): Promise<void> {
    await this.pending;
    await this.source.close();
  }
}

function validateProfile(profile: ConnectionProfile): void {
  if (!profile?.id || !profile.name?.trim() || !profile.host?.trim() || !profile.user?.trim()) throw new Error('Profile name, host and user are required.');
  if (!Number.isInteger(profile.port) || profile.port < 1 || profile.port > 65535) throw new Error('Port must be between 1 and 65535.');
  if (!profile.databases || !DATABASES.some((db) => profile.databases[db]?.trim())) throw new Error('Configure at least one database schema.');
}

export const service = new WyrmrestService();
