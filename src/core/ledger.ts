import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { appHome } from './paths.js';
import { writeJsonAtomic } from './persistence.js';
import { identityKey, sameValue } from '../shared/values.js';
import type { CellValue, LedgerState, StageRequest, StagedChange } from '../shared/types.js';

/** Persisted, copy-on-write ledger. No caller can mutate its snapshots, and a
 * failed disk write never leaves an unpersisted change in memory. */
export class Ledger {
  private state: LedgerState = { changes: [], updatedAt: new Date().toISOString() };
  private readonly file: string;

  constructor(file = path.join(appHome(), 'ledger.json')) {
    this.file = file;
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as LedgerState;
        if (!Array.isArray(parsed.changes) || parsed.changes.some((c) =>
          !c.id || !['insert', 'update', 'delete'].includes(c.kind) || !c.key || !c.values)) {
          throw new Error('invalid ledger format');
        }
        this.state = parsed;
      }
    } catch (err) {
      // Preserve corrupt work rather than overwriting it on the next edit.
      if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.corrupt-${Date.now()}`);
      console.warn(`ledger: could not read ${file}: ${(err as Error).message}`);
    }
  }

  private persist(changes: StagedChange[]): LedgerState {
    const next = { changes, updatedAt: new Date(Math.max(Date.now(), Date.parse(this.state.updatedAt) + 1 || 0)).toISOString() };
    writeJsonAtomic(this.file, next);
    this.state = next;
    return this.get();
  }

  get(): LedgerState {
    return structuredClone(this.state);
  }

  find(id: string): StagedChange | undefined {
    return this.select([id])[0];
  }

  select(ids?: string[]): StagedChange[] {
    // Explicitly selecting nothing must never accidentally apply/export all.
    const selected = ids === undefined ? this.state.changes : this.state.changes.filter((c) => ids.includes(c.id));
    return structuredClone(selected);
  }

  stage(input: StageRequest): LedgerState {
    const request = structuredClone(input);
    const changes = structuredClone(this.state.changes);
    const now = new Date().toISOString();
    const keyId = stableKey(request.database, request.table, request.key);
    const existing = request.changeId
      ? changes.find((c) => c.id === request.changeId)
      : changes.find((c) => Object.keys(request.key).length > 0 && stableKey(c.database, c.table, c.key) === keyId);
    if (request.changeId && (!existing || existing.database !== request.database || existing.table !== request.table)) {
      throw new Error('This staged row no longer exists. Refresh and try again.');
    }
    if (existing?.kind === 'delete') {
      if (request.kind === 'delete') return this.get();
      throw new Error('Revert the staged deletion before editing this row.');
    }

    if (request.kind === 'delete') {
      if (existing?.kind === 'insert') return this.persist(changes.filter((c) => c.id !== existing.id));
      const remaining = changes.filter((c) => c.id !== existing?.id);
      remaining.push({
        id: existing?.id ?? randomUUID(), kind: 'delete', database: request.database, table: request.table,
        key: request.key, values: {}, snapshot: request.snapshot, note: request.note,
        createdAt: existing?.createdAt ?? now, updatedAt: now,
      });
      return this.persist(remaining);
    }

    if (existing) {
      if (request.kind === 'insert' && !request.changeId) {
        throw new Error('A change with this key is already staged. Choose a different key for the new row.');
      }
      for (const [column, delta] of Object.entries(request.values ?? {})) {
        const before = existing.values[column]?.before ?? delta.before;
        // Do not use ?? for a prior NULL: it is the real original value.
        const original = existing.values[column] ? existing.values[column].before : before;
        if (existing.kind === 'update' && sameValue(original, delta.after)) delete existing.values[column];
        else existing.values[column] = { before: original, after: delta.after };
        if (existing.kind === 'insert' && existing.snapshot) existing.snapshot[column] = delta.after;
      }
      if (existing.kind === 'insert') {
        existing.key = request.key;
        if (!existing.snapshot && request.snapshot) existing.snapshot = request.snapshot;
        const collision = Object.keys(existing.key).length && changes.some((c) => c.id !== existing.id &&
          stableKey(c.database, c.table, c.key) === stableKey(existing.database, existing.table, existing.key));
        if (collision) throw new Error('Another staged row already uses this key.');
      }
      if (request.note !== undefined) existing.note = request.note;
      existing.updatedAt = now;
      return this.persist(changes.filter((c) => c.kind !== 'update' || Object.keys(c.values).length > 0));
    }

    const values = Object.fromEntries(Object.entries(request.values ?? {}).filter(([, delta]) =>
      request.kind === 'insert' || !sameValue(delta.before, delta.after)));
    if (request.kind === 'update' && !Object.keys(values).length) return this.get();
    changes.push({
      id: randomUUID(), kind: request.kind, database: request.database, table: request.table,
      key: request.key, values, snapshot: request.snapshot, note: request.note, createdAt: now, updatedAt: now,
    });
    return this.persist(changes);
  }

  revert(ids: string[]): LedgerState {
    return this.persist(this.state.changes.filter((c) => !ids.includes(c.id)));
  }

  clear(): LedgerState {
    return this.persist([]);
  }

  pendingFor(database: string, table: string, key: Record<string, CellValue>): StagedChange | undefined {
    const id = stableKey(database, table, key);
    return this.get().changes.find((c) => stableKey(c.database, c.table, c.key) === id);
  }
}

export function stableKey(database: string, table: string, key: Record<string, CellValue>): string {
  return JSON.stringify([database, table, identityKey(key)]);
}
