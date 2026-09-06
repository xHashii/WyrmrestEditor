import { DemoDataSource, MySqlDataSource, type DataSource } from './datasource.js';
import { Ledger } from './ledger.js';
import { entityMeta, metadataIndex, tableMeta } from './metadata.js';
import { exportChanges, renderChanges } from './export.js';
import { loadSettings, saveSettings } from './settings.js';
import { renderChange } from './sql.js';
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

  async getIndex(): Promise<MetadataIndex> {
    return metadataIndex();
  }

  async getTable(database: DatabaseName, table: string): Promise<TableMeta> {
    return tableMeta(database, table);
  }

  async getStatus(): Promise<ConnectionStatus> {
    return this.source.status();
  }

  /**
   * Try a profile without making it active. Never touches `this.source`, so a
   * failed (or successful) probe leaves the running session untouched.
   */
  async testConnection(profile: ConnectionProfile): Promise<ConnectionStatus> {
    try {
      return await MySqlDataSource.probe(profile);
    } catch (err) {
      const message = (err as Error).message;
      // Report every configured schema as unavailable (rather than leaking
      // demo-mode "available" pills) so the dialog shows what failed.
      const databases: ConnectionStatus['databases'] = {};
      for (const db of DATABASES) {
        databases[db] = profile.databases[db]
          ? { available: false, tables: 0, error: message }
          : { available: false, tables: 0, error: 'not configured' };
      }
      return {
        mode: 'live',
        connected: false,
        profile: { id: profile.id, name: profile.name, host: profile.host, port: profile.port, user: profile.user, databases: profile.databases },
        serverVersion: null,
        message: `Could not connect: ${message}`,
        databases,
      };
    }
  }

  async connect(profile: ConnectionProfile): Promise<ConnectionStatus> {
    await this.source.close();
    try {
      this.source = await MySqlDataSource.connect(profile);
      const profiles = this.settings.profiles.filter((p) => p.id !== profile.id);
      profiles.push(profile);
      this.settings = saveSettings({ profiles, activeProfileId: profile.id, mode: 'live' });
      return this.source.status();
    } catch (err) {
      this.source = new DemoDataSource();
      const status = this.source.status();
      return {
        ...status,
        message: `Connection failed: ${(err as Error).message} — staying in demo mode.`,
      };
    }
  }

  async useDemo(): Promise<ConnectionStatus> {
    await this.source.close();
    this.source = new DemoDataSource();
    this.settings = saveSettings({ mode: 'demo', activeProfileId: null });
    return this.source.status();
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
    const meta = tableMeta(request.database, request.table);
    if (meta.readOnly) throw new Error(`${meta.name} is read-only`);
    const state = this.ledger.stage(request);
    // Keep demo data in sync so the grid reflects staged edits immediately.
    if (this.source instanceof DemoDataSource) {
      const values: Record<string, any> = {};
      for (const [column, delta] of Object.entries(request.values ?? {})) values[column] = delta.after;
      this.source.applyToMemory(
        request.database,
        request.table,
        request.kind,
        request.key,
        request.kind === 'insert' ? (request.snapshot ?? values) : values,
      );
    }
    return state;
  }

  async revert(changeIds: string[]): Promise<LedgerState> {
    return this.ledger.revert(changeIds);
  }

  async clearLedger(): Promise<LedgerState> {
    return this.ledger.clear();
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
  }

  async applyToDatabase(changeIds?: string[]): Promise<ApplyResult> {
    const changes = this.ledger.select(changeIds);
    const failed: ApplyResult['failed'] = [];
    let applied = 0;
    for (const change of changes) {
      try {
        const meta = tableMeta(change.database, change.table);
        for (const statement of renderChange(meta, change)) {
          await this.source.execute(change.database, statement);
        }
        this.ledger.revert([change.id]);
        applied++;
      } catch (err) {
        failed.push({ changeId: change.id, error: (err as Error).message });
      }
    }
    return { applied, failed };
  }

  async getSettings(): Promise<AppSettings> {
    return this.settings;
  }

  async saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = saveSettings(patch);
    return this.settings;
  }

  /** Reconnect using the stored profile, used at startup. */
  async restore(): Promise<ConnectionStatus> {
    const profile = this.settings.profiles.find((p) => p.id === this.settings.activeProfileId);
    if (this.settings.mode === 'live' && profile) return this.connect(profile);
    return this.source.status();
  }

  async shutdown(): Promise<void> {
    await this.source.close();
  }
}

export const service = new WyrmrestService();
