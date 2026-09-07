import type { CellValue, ColumnMeta, Row, StagedChange, TableMeta } from '../shared/types.js';
import { insertKey, sameValue } from '../shared/values.js';
export { sameValue } from '../shared/values.js';

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
    if (typeof value === 'number') {
      if (!Number.isSafeInteger(value)) throw new Error(`${column?.name}: unsafe or invalid integer`);
      return String(value);
    }
    const text = String(value).trim();
    if (!/^-?\d+$/.test(text)) throw new Error(`${column?.name}: invalid integer`);
    return text;
  }
  if (kind === 'float') {
    if (/^(decimal|numeric)$/i.test(column?.baseType ?? '') && /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(String(value))) return String(value);
    const num = typeof value === 'number' ? value : Number(String(value).trim());
    if (Number.isFinite(num)) {
      // Keep float columns readable: 1 rather than 1.0000000000, but never
      // lose precision for values like 1.14286.
      return String(num);
    }
    throw new Error(`${column?.name}: invalid number`);
  }
  if (kind === 'binary' && value === '0x') return "X''";
  if (kind === 'binary' && typeof value === 'string' && /^0x[0-9a-f]*$/i.test(value)) return value;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Cannot write a non-finite SQL value');
    return String(value);
  }
  return escapeString(String(value));
}

const columnOf = (table: TableMeta, name: string): ColumnMeta => {
  const column = table.columns.find((c) => c.name === name);
  if (!column) throw new Error(`unknown column ${table.name}.${name}`);
  return column;
};

function whereClause(table: TableMeta, key: Record<string, CellValue>): string {
  const entries = Object.entries(key);
  const required = table.identityColumns.length ? table.identityColumns : table.columns.map((c) => c.name);
  if (!entries.length || required.some((c) => !Object.hasOwn(key, c))) {
    throw new Error(`cannot address a row in ${table.name} without all key columns`);
  }
  for (const [name] of entries) columnOf(table, name);
  return entries
    .map(([col, value]) =>
      value === null
        ? `${quoteIdent(col)} IS NULL`
        : `${quoteIdent(col)}=${formatValue(columnOf(table, col), value)}`,
    )
    .join(' AND ');
}

export function renderInsert(table: TableMeta, row: Row): string {
  for (const name of Object.keys(row)) columnOf(table, name);
  const columns = table.columns.filter((c) => row[c.name] !== undefined &&
    !(c.autoIncrement && (row[c.name] == null || String(row[c.name]) === '0')));
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
  return `UPDATE ${quoteIdent(table.name)} SET ${sets.join(', ')} WHERE ${whereClause(table, key)}${table.identityColumns.length ? '' : ' LIMIT 1'};`;
}

export function renderDelete(table: TableMeta, key: Record<string, CellValue>): string {
  return `DELETE FROM ${quoteIdent(table.name)} WHERE ${whereClause(table, key)}${table.identityColumns.length ? '' : ' LIMIT 1'};`;
}

/**
 * Statements for one staged change, in the order TrinityCore update files use:
 * inserts are preceded by a DELETE so the file can be replayed safely.
 */
export function renderChange(table: TableMeta, change: StagedChange): string[] {
  if (table.readOnly) throw new Error(`${table.name} is read-only`);
  switch (change.kind) {
    case 'insert': {
      const row = change.snapshot ?? {};
      const statements: string[] = [];
      const key = insertKey(table, row);
      if (Object.keys(key).length) statements.push(renderDelete(table, key));
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
