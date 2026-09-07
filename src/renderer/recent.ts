import { DATABASES, type ConnectionStatus, type DatabaseName } from '../shared/types';

/** Navigation history only: never row data, SQL, connection details or passwords. */
export type RecentItem = { source: string; label: string } & (
  | { kind: 'table'; database: DatabaseName; table: string }
  | { kind: 'script'; entryorguid: string; sourceType: number }
);
export const RECENT_KEY = 'wyrmrest.recent.v1';
const LIMIT = 40;

export function recentSource(status: ConnectionStatus | null): string {
  return status?.mode === 'live' ? `profile:${status.profile?.id ?? 'unknown'}` : 'demo';
}

export function recentKey(item: RecentItem): string {
  return JSON.stringify(item.kind === 'table'
    ? [item.source, item.kind, item.database, item.table]
    : [item.source, item.kind, item.entryorguid, item.sourceType]);
}

export function addRecent(items: RecentItem[], item: RecentItem): RecentItem[] {
  return [item, ...items.filter((entry) => recentKey(entry) !== recentKey(item))].slice(0, LIMIT);
}

export function parseRecent(raw: string | null): RecentItem[] {
  try {
    const data: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is RecentItem => {
      if (!item || typeof item.source !== 'string' || typeof item.label !== 'string' || item.label.length > 1000) return false;
      if (item.kind === 'table') return DATABASES.includes(item.database) && typeof item.table === 'string' && /^\w+$/.test(item.table);
      return item.kind === 'script' && typeof item.entryorguid === 'string' && /^-?\d{1,20}$/.test(item.entryorguid) &&
        Number.isInteger(item.sourceType) && item.sourceType >= 0 && item.sourceType <= 255;
    }).slice(0, LIMIT);
  } catch { return []; }
}

export function loadRecent(): RecentItem[] {
  try { return parseRecent(window.localStorage.getItem(RECENT_KEY)); }
  catch { return []; }
}

/** A blocked/full browser store must not stop editing. Keep history in memory. */
export function saveRecent(items: RecentItem[]): boolean {
  try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(items)); return true; }
  catch { return false; }
}
