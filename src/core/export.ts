import fs from 'node:fs';
import path from 'node:path';
import { tableMeta } from './metadata.js';
import { renderChange } from './sql.js';
import type {
  DatabaseName,
  ExportRequest,
  ExportResult,
  ExportedFile,
  StagedChange,
} from '../shared/types.js';

/**
 * Writes staged changes as TrinityCore style update files:
 *
 *   sql/updates/<db>/<version>/YYYY_MM_DD_NN_<db>.sql
 *
 * `NN` is a two digit sequence that continues from whatever already exists for
 * that day, so repeated exports never overwrite each other.
 */

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

export function updateDirFor(root: string, database: DatabaseName, version: string): string {
  return path.join(root, 'sql', 'updates', database, version);
}

export function nextFileName(dir: string, database: DatabaseName, when = new Date()): string {
  const datePart = `${when.getFullYear()}_${pad(when.getMonth() + 1)}_${pad(when.getDate())}`;
  let sequence = 0;
  if (fs.existsSync(dir)) {
    const re = new RegExp(`^${datePart}_(\\d{2})_${database}\\.sql$`);
    for (const file of fs.readdirSync(dir)) {
      const m = re.exec(file);
      if (m) sequence = Math.max(sequence, Number(m[1]) + 1);
    }
  }
  return `${datePart}_${pad(sequence)}_${database}.sql`;
}

function header(database: DatabaseName, version: string, changes: StagedChange[], author: string): string {
  const counts = { insert: 0, update: 0, delete: 0 } as Record<string, number>;
  for (const c of changes) counts[c.kind]++;
  const tables = [...new Set(changes.map((c) => c.table))].sort();
  return [
    '-- ---------------------------------------------------------------------',
    '-- Wyrmrest Editor — staged change export',
    `-- Database : ${database} (${version})`,
    `-- Generated: ${new Date().toISOString()}`,
    author ? `-- Author   : ${author}` : null,
    `-- Changes  : ${changes.length} (${counts.insert} insert, ${counts.update} update, ${counts.delete} delete)`,
    `-- Tables   : ${tables.join(', ')}`,
    '-- ---------------------------------------------------------------------',
    '',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/** Render the SQL body for one database's worth of changes. */
export function renderChanges(database: DatabaseName, changes: StagedChange[], version: string, author = ''): { sql: string; statements: number } {
  const byTable = new Map<string, StagedChange[]>();
  for (const change of changes) {
    const list = byTable.get(change.table) ?? [];
    list.push(change);
    byTable.set(change.table, list);
  }

  const blocks: string[] = [];
  let statements = 0;
  for (const table of [...byTable.keys()].sort()) {
    const meta = tableMeta(database, table);
    const lines: string[] = [`-- ${meta.name}${meta.label && meta.label !== meta.name ? ` (${meta.label})` : ''}`];
    for (const change of byTable.get(table)!) {
      if (change.note) lines.push(`-- ${change.note}`);
      for (const statement of renderChange(meta, change)) {
        lines.push(statement);
        statements++;
      }
    }
    blocks.push(lines.join('\n'));
  }

  return { sql: `${header(database, version, changes, author)}${blocks.join('\n\n')}\n`, statements };
}

export function exportChanges(
  changes: StagedChange[],
  options: ExportRequest & { root: string; version: string; author: string },
): ExportResult {
  const byDatabase = new Map<DatabaseName, StagedChange[]>();
  for (const change of changes) {
    const list = byDatabase.get(change.database) ?? [];
    list.push(change);
    byDatabase.set(change.database, list);
  }

  const files: ExportedFile[] = [];
  const when = new Date();
  for (const [database, list] of [...byDatabase.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const dir = updateDirFor(options.root, database, options.version);
    const fileName = nextFileName(dir, database, when);
    const { sql, statements } = renderChanges(database, list, options.version, options.author);
    const absolute = path.join(dir, fileName);

    if (!options.dryRun) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(absolute, sql, 'utf8');
    }

    files.push({
      database,
      path: absolute,
      relativePath: path.relative(options.root, absolute).split(path.sep).join('/'),
      sql,
      changeCount: list.length,
      statementCount: statements,
    });
  }

  return { files, dryRun: Boolean(options.dryRun), exportedAt: when.toISOString() };
}
