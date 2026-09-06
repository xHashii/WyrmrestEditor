import type { CellValue, ColumnMeta, Row, StagedChange, TableMeta } from '../shared/types.js';

/**
 * SQL rendering. Everything the editor writes to disk (or applies to a live
 * server) is produced here so quoting rules live in exactly one place.
 */

export function quoteIdent(name: string): string {
  if (!/^[A-Za-z0-9_$]+$/.test(name)) {
    // Defensive: identifiers always come from parsed metadata, never user input.
    return `\`${name.replace(/`/g, '``')}\``;
  }
  return `\`${name}\``;
}

export function escapeString(value: string): string {
  let out = '';
  for (const ch of value) {
    switch (ch) {
      case '\0':
        out += '\\0';
        break;
      case '\b':
        out += '\\b';
        break;
      case '\t':
        out += '\\t';
        break;
      case '\n':
        out += '\\n';
        break;
      case '\r':
        out += '\\r';
        break;
      case '\x1a':
        out += '\\Z';
        break;
      case "'":
        out += "\\'";
        break;
      case '\\':
        out += '\\\\';
        break;
      default:
        out += ch;
    }
  }
  return `'${out}'`;
}

/** Render a value for a specific column, honouring its declared type. */
export function formatValue(column: ColumnMeta | undefined, value: CellValue): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';

  const kind = column?.kind;
  if (kind === 'integer') {
    if (typeof value === 'number') return String(Math.trunc(value));
    const text = String(value).trim();
    return /^-?\d+$/.test(text) ? text : escapeString(text);
  }
  if (kind === 'float') {
    const num = typeof value === 'number' ? value : Number(String(value).trim());
    if (Number.isFinite(num)) {
      // Keep float columns readable: 1 rather than 1.0000000000, but never
      // lose precision for values like 1.14286.
      return String(num);
    }
    return escapeString(String(value));
  }
  if (kind === 'binary' && typeof value === 'string' && /^0x[0-9a-f]*$/i.test(value)) return value;

  if (typeof value === 'number') return String(value);
  return escapeString(String(value));
}

const columnOf = (table: TableMeta, name: string) => table.columns.find((c) => c.name === name);

function whereClause(table: TableMeta, key: Record<string, CellValue>): string {
  const entries = Object.entries(key);
  if (!entries.length) throw new Error(`cannot address a row in ${table.name} without key columns`);
  return entries
    .map(([col, value]) =>
      value === null
        ? `${quoteIdent(col)} IS NULL`
        : `${quoteIdent(col)}=${formatValue(columnOf(table, col), value)}`,
    )
    .join(' AND ');
}

export function renderInsert(table: TableMeta, row: Row): string {
  const columns = table.columns.filter((c) => row[c.name] !== undefined);
  const names = columns.map((c) => quoteIdent(c.name)).join(', ');
  const values = columns.map((c) => formatValue(c, row[c.name] ?? null)).join(', ');
  return `INSERT INTO ${quoteIdent(table.name)} (${names}) VALUES (${values});`;
}

export function renderUpdate(
  table: TableMeta,
  key: Record<string, CellValue>,
  values: Record<string, { before: CellValue; after: CellValue }>,
): string {
  const sets = Object.entries(values)
    .filter(([, v]) => !sameValue(v.before, v.after))
    .map(([col, v]) => `${quoteIdent(col)}=${formatValue(columnOf(table, col), v.after)}`);
  if (!sets.length) return '';
  return `UPDATE ${quoteIdent(table.name)} SET ${sets.join(', ')} WHERE ${whereClause(table, key)};`;
}

export function renderDelete(table: TableMeta, key: Record<string, CellValue>): string {
  return `DELETE FROM ${quoteIdent(table.name)} WHERE ${whereClause(table, key)};`;
}

export function sameValue(a: CellValue, b: CellValue): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a === 'number' || typeof b === 'number') {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na === nb;
  }
  return String(a) === String(b);
}

/**
 * Statements for one staged change, in the order TrinityCore update files use:
 * inserts are preceded by a DELETE so the file can be replayed safely.
 */
export function renderChange(table: TableMeta, change: StagedChange): string[] {
  switch (change.kind) {
    case 'insert': {
      const row = change.snapshot ?? {};
      const statements: string[] = [];
      if (Object.keys(change.key).length) statements.push(renderDelete(table, change.key));
      statements.push(renderInsert(table, row));
      return statements;
    }
    case 'update': {
      const sql = renderUpdate(table, change.key, change.values);
      return sql ? [sql] : [];
    }
    case 'delete':
      return [renderDelete(table, change.key)];
    default:
      return [];
  }
}

export function describeChange(change: StagedChange): string {
  const key = Object.entries(change.key)
    .map(([k, v]) => `${k}=${v ?? 'NULL'}`)
    .join(', ');
  const columns = Object.keys(change.values ?? {});
  switch (change.kind) {
    case 'insert':
      return `INSERT ${change.table} (${key || 'new row'})`;
    case 'delete':
      return `DELETE ${change.table} (${key})`;
    default:
      return `UPDATE ${change.table} (${key}) — ${columns.join(', ')}`;
  }
}
