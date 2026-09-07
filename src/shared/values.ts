import type { CellValue, ColumnMeta, Row, TableMeta } from './types.js';

/** JSON-safe integer: never round a BIGINT to fit JavaScript's number type. */
export function integerValue(value: bigint): number | string {
  return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : value.toString();
}

/** A numeric string from mysql2 and the corresponding number address the same
 * value, but NULL, an empty string and the literal "NULL" are always distinct. */
export function sameValue(a: CellValue | undefined, b: CellValue | undefined): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a === 'boolean' || typeof b === 'boolean') return sameValue(typeof a === 'boolean' ? Number(a) : a, typeof b === 'boolean' ? Number(b) : b);
  if (typeof a === 'number' || typeof b === 'number') {
    if (String(a).trim() === '' || String(b).trim() === '') return false;
    if (/^-?\d+$/.test(String(a)) && /^-?\d+$/.test(String(b))) return BigInt(a) === BigInt(b);
    return Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Number(a) === Number(b);
  }
  return a === b;
}

/** Collision-free, order-independent row identity (including composite keys). */
export function identityKey(key: Record<string, CellValue>): string {
  return JSON.stringify(Object.keys(key).sort().map((column) => [column, key[column] == null ? null : String(key[column])]));
}

export function keyValues(meta: TableMeta, row: Row): Record<string, CellValue> {
  const columns = meta.identityColumns.length ? meta.identityColumns : meta.columns.map((c) => c.name);
  return Object.fromEntries(columns.map((column) => [column, row[column] ?? null]));
}

export function insertKey(meta: TableMeta, row: Row): Record<string, CellValue> {
  // An auto-generated or keyless insert has no replay-safe DELETE predicate.
  if (!meta.identityColumns.length || meta.identityColumns.some((name) => row[name] == null ||
    (meta.columns.find((c) => c.name === name)?.autoIncrement && String(row[name]) === '0'))) return {};
  return Object.fromEntries(meta.identityColumns.map((name) => [name, row[name]]));
}

/** Validate the entire input, rather than silently turning "12oops" into 12 or
 * an invalid value into zero. Nullable text still supports the empty string. */
export function parseCellValue(column: ColumnMeta, value: CellValue): CellValue {
  if (value === null) {
    if (!column.nullable && !column.autoIncrement) throw new Error(`${column.name} cannot be NULL.`);
    return null;
  }
  if (column.kind === 'integer') {
    const text = typeof value === 'boolean' ? String(Number(value)) : String(value).trim();
    if (!/^[+-]?\d+$/.test(text)) throw new Error(`${column.name}: enter a whole number.`);
    if (typeof value === 'number' && !Number.isSafeInteger(value)) {
      throw new Error(`${column.name}: enter large integers as text to preserve every digit.`);
    }
    const number = BigInt(text);
    if (column.range && (number < BigInt(column.range.min) || number > BigInt(column.range.max))) {
      throw new Error(`${column.name} must be between ${column.range.min} and ${column.range.max}.`);
    }
    return integerValue(number);
  }
  if (column.kind === 'float') {
    const text = String(value).trim();
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(Number(text))) {
      throw new Error(`${column.name}: enter a finite number.`);
    }
    if (column.unsigned && Number(text) < 0) throw new Error(`${column.name} cannot be negative.`);
    // DECIMAL is an exact type; avoid a round trip through binary floating point.
    return /^(decimal|numeric)$/i.test(column.baseType) ? text : Number(text);
  }
  const text = String(value);
  if (column.kind === 'binary' && !/^0x(?:[0-9a-f]{2})*$/i.test(text)) {
    throw new Error(`${column.name}: use hexadecimal byte pairs, for example 0x00FF.`);
  }
  if (column.kind === 'string' && column.length && [...text].length > column.length) {
    throw new Error(`${column.name} allows at most ${column.length} characters.`);
  }
  return text;
}

export function defaultRow(meta: TableMeta): Row {
  const row: Row = {};
  for (const column of meta.columns) {
    if (column.autoIncrement) row[column.name] = null;
    else if (column.hasDefault && column.default !== null) {
      row[column.name] = column.kind === 'binary' && column.default === '' ? '0x' : /^current_timestamp/i.test(column.default)
        ? new Date().toISOString().slice(0, 19).replace('T', ' ')
        : parseCellValue(column, column.default);
    } else if (column.nullable) row[column.name] = null;
    else if (column.kind === 'integer' || column.kind === 'float') row[column.name] = 0;
    else if (column.kind === 'binary') row[column.name] = '0x';
    else if (column.kind === 'datetime') row[column.name] = new Date().toISOString().slice(0, 19).replace('T', ' ');
    else row[column.name] = '';
  }
  return row;
}

export const valueText = (value: CellValue | undefined): string => value == null ? 'NULL' : value === '' ? '(empty string)' : String(value);

export function versionError(version: string): string | null {
  return typeof version === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(version) && !version.includes('..')
    ? null : 'Use a version folder such as 3.4.3 (letters, numbers, dots, hyphens or underscores; no paths).';
}
