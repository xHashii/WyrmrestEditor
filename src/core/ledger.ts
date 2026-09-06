import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { appHome } from './paths.js';
import { sameValue } from './sql.js';
import type { CellValue, LedgerState, StageRequest, StagedChange } from '../shared/types.js';

/**
 * The staged-changes ledger.
 *
 * Nothing the user edits touches the database directly: every edit is recorded
 * here, can be reviewed / reverted individually, and is later rendered into a
 * `sql/updates/<db>/<version>/…` file (or optionally applied live).
 *
 * The ledger is persisted to disk so a crash or restart never loses work.
 */
export class Ledger {
  private state: LedgerState = { changes: [], updatedAt: new Date().toISOString() };
  private readonly file: string;

  constructor(file = path.join(appHome(), 'ledger.json')) {
    this.file = file;
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.file)) {
        const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as LedgerState;
        if (Array.isArray(parsed.changes)) this.state = parsed;
      }
    } catch (err) {
      // A corrupt ledger must never prevent the app from starting; keep a copy.
      try {
        fs.renameSync(this.file, `${this.file}.corrupt-${Date.now()}`);
      } catch {
        /* ignore */
      }
      console.warn(`ledger: could not read ${this.file}: ${(err as Error).message}`);
    }
  }

  private persist(): void {
    this.state.updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.state, null, 2));
  }

  get(): LedgerState {
    return { changes: [...this.state.changes], updatedAt: this.state.updatedAt };
  }

  find(id: string): StagedChange | undefined {
    return this.state.changes.find((c) => c.id === id);
  }

  select(ids?: string[]): StagedChange[] {
    if (!ids?.length) return [...this.state.changes];
    const set = new Set(ids);
    return this.state.changes.filter((c) => set.has(c.id));
  }

  /**
   * Stage an edit. Repeated edits to the same row are merged into one change so
   * the exported file contains a single statement per row, and edits that
   * restore the original value disappear again.
   */
  stage(request: StageRequest): LedgerState {
    const now = new Date().toISOString();
    const keyId = stableKey(request.database, request.table, request.key);
    const existing = this.state.changes.find(
      (c) => stableKey(c.database, c.table, c.key) === keyId && c.kind !== 'delete',
    );

    if (request.kind === 'delete') {
      // Deleting a row that was only staged as an insert cancels both.
      if (existing?.kind === 'insert') {
        this.state.changes = this.state.changes.filter((c) => c.id !== existing.id);
        this.persist();
        return this.get();
      }
      this.state.changes = this.state.changes.filter((c) => c.id !== existing?.id);
      this.state.changes.push({
        id: randomUUID(),
        kind: 'delete',
        database: request.database,
        table: request.table,
        key: request.key,
        values: {},
        snapshot: request.snapshot,
        note: request.note,
        createdAt: now,
        updatedAt: now,
      });
      this.persist();
      return this.get();
    }

    if (existing) {
      for (const [column, delta] of Object.entries(request.values ?? {})) {
        const prior = existing.values[column];
        const before = prior ? prior.before : delta.before;
        if (existing.kind === 'update' && sameValue(before, delta.after)) {
          delete existing.values[column];
        } else {
          existing.values[column] = { before, after: delta.after };
        }
        if (existing.snapshot) existing.snapshot[column] = delta.after;
      }
      if (request.note !== undefined) existing.note = request.note;
      existing.updatedAt = now;
      // An update whose columns all returned to their original values is a no-op.
      if (existing.kind === 'update' && Object.keys(existing.values).length === 0) {
        this.state.changes = this.state.changes.filter((c) => c.id !== existing.id);
      }
      this.persist();
      return this.get();
    }

    this.state.changes.push({
      id: randomUUID(),
      kind: request.kind,
      database: request.database,
      table: request.table,
      key: request.key,
      values: request.values ?? {},
      snapshot: request.snapshot,
      note: request.note,
      createdAt: now,
      updatedAt: now,
    });
    this.persist();
    return this.get();
  }

  revert(ids: string[]): LedgerState {
    const set = new Set(ids);
    this.state.changes = this.state.changes.filter((c) => !set.has(c.id));
    this.persist();
    return this.get();
  }

  clear(): LedgerState {
    this.state.changes = [];
    this.persist();
    return this.get();
  }

  /** Pending edits for one row, used by the grid to show dirty cells. */
  pendingFor(database: string, table: string, key: Record<string, CellValue>): StagedChange | undefined {
    const id = stableKey(database, table, key);
    return this.state.changes.find((c) => stableKey(c.database, c.table, c.key) === id);
  }
}

export function stableKey(database: string, table: string, key: Record<string, CellValue>): string {
  const parts = Object.keys(key)
    .sort()
    .map((k) => `${k}=${key[k] ?? 'NULL'}`);
  return `${database}.${table}#${parts.join('&')}`;
}
