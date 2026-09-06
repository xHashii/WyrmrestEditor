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
} from '../shared/types';

/**
 * One transport, two backends: Electron IPC when running as a desktop app,
 * HTTP (via the Vite proxy) when running in a browser.
 */

interface DesktopBridge {
  isDesktop: true;
  platform: string;
  invoke: (channel: string, ...args: unknown[]) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
  onMenu: (handler: (action: string) => void) => () => void;
}

declare global {
  interface Window {
    wyrmrest?: DesktopBridge;
  }
}

export const isDesktop = (): boolean => Boolean(window.wyrmrest?.isDesktop);

async function viaHttp<T>(path: string, body?: unknown, method: 'GET' | 'POST' = body ? 'POST' : 'GET'): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({ ok: false, error: response.statusText }));
  if (!payload.ok) throw new Error(payload.error ?? `request failed: ${path}`);
  return payload.data as T;
}

async function viaIpc<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = await window.wyrmrest!.invoke(channel, ...args);
  if (!result.ok) throw new Error(result.error ?? `ipc call failed: ${channel}`);
  return result.data as T;
}

const call = <T>(channel: string, httpPath: string, ipcArgs: unknown[] = [], httpBody?: unknown, method?: 'GET' | 'POST'): Promise<T> =>
  isDesktop() ? viaIpc<T>(channel, ...ipcArgs) : viaHttp<T>(httpPath, httpBody, method);

export const api = {
  getIndex: () => call<MetadataIndex>('getIndex', 'metadata'),
  getTable: (database: DatabaseName, table: string) =>
    call<TableMeta>('getTable', `metadata/${database}/${table}`, [database, table]),
  getStatus: () => call<ConnectionStatus>('getStatus', 'status'),
  connect: (profile: ConnectionProfile) => call<ConnectionStatus>('connect', 'connect', [profile], profile),
  useDemo: () => call<ConnectionStatus>('useDemo', 'demo', [], {}),
  disconnect: () => call<ConnectionStatus>('disconnect', 'disconnect', [], {}),
  query: (request: QueryRequest) => call<QueryResult>('query', 'query', [request], request),
  lookup: (request: LookupRequest) => call<LookupItem[]>('lookup', 'lookup', [request], request),
  resolveNames: (entity: string, ids: (number | string)[]) =>
    call<Record<string, string>>('resolveNames', 'resolve-names', [entity, ids], { entity, ids }),
  getLedger: () => call<LedgerState>('getLedger', 'ledger'),
  stage: (request: StageRequest) => call<LedgerState>('stage', 'ledger/stage', [request], request),
  revert: (changeIds: string[]) => call<LedgerState>('revert', 'ledger/revert', [changeIds], { changeIds }),
  clearLedger: () => call<LedgerState>('clearLedger', 'ledger/clear', [], {}),
  previewSql: (changeIds?: string[]) =>
    isDesktop()
      ? viaIpc<string>('previewSql', changeIds)
      : viaHttp<{ sql: string }>('ledger/preview', { changeIds }).then((r) => r.sql),
  exportSql: (request: ExportRequest) => call<ExportResult>('exportSql', 'ledger/export', [request], request),
  applyToDatabase: (changeIds?: string[]) =>
    call<ApplyResult>('applyToDatabase', 'ledger/apply', [changeIds], { changeIds }),
  getSettings: () => call<AppSettings>('getSettings', 'settings'),
  saveSettings: (patch: Partial<AppSettings>) => call<AppSettings>('saveSettings', 'settings', [patch], patch),
  chooseExportRoot: () => (isDesktop() ? viaIpc<AppSettings | null>('chooseExportRoot') : Promise.resolve(null)),
  reveal: (target: string) => (isDesktop() ? viaIpc<boolean>('revealPath', target) : Promise.resolve(false)),
};
