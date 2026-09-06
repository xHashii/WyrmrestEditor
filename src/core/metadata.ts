import fs from 'node:fs';
import path from 'node:path';
import { METADATA_DIR } from './paths.js';
import type { DatabaseName, MetadataIndex, TableMeta } from '../shared/types.js';

/**
 * Loads the generated metadata (see tools/*.mjs). Everything is read lazily and
 * cached: the four table files together are a few megabytes.
 */

let indexCache: MetadataIndex | null = null;
const tableCache = new Map<DatabaseName, Map<string, TableMeta>>();

export function metadataIndex(): MetadataIndex {
  if (indexCache) return indexCache;
  const file = path.join(METADATA_DIR, 'index.json');
  if (!fs.existsSync(file)) {
    throw new Error(
      `metadata not built — expected ${file}. Run: npm run metadata`,
    );
  }
  indexCache = JSON.parse(fs.readFileSync(file, 'utf8')) as MetadataIndex;
  return indexCache;
}

function loadDatabase(database: DatabaseName): Map<string, TableMeta> {
  const cached = tableCache.get(database);
  if (cached) return cached;
  const file = path.join(METADATA_DIR, 'tables', `${database}.json`);
  if (!fs.existsSync(file)) throw new Error(`metadata for "${database}" not built — run: npm run metadata`);
  const payload = JSON.parse(fs.readFileSync(file, 'utf8')) as { tables: TableMeta[] };
  const map = new Map<string, TableMeta>();
  for (const table of payload.tables) map.set(table.name.toLowerCase(), table);
  tableCache.set(database, map);
  return map;
}

export function tableMeta(database: DatabaseName, table: string): TableMeta {
  const meta = loadDatabase(database).get(table.toLowerCase());
  if (!meta) throw new Error(`unknown table ${database}.${table}`);
  return meta;
}

export function tryTableMeta(database: DatabaseName, table: string): TableMeta | null {
  try {
    return tableMeta(database, table);
  } catch {
    return null;
  }
}

export function allTables(database: DatabaseName): TableMeta[] {
  return [...loadDatabase(database).values()];
}

export function entityMeta(key: string) {
  const entity = metadataIndex().entities[key];
  if (!entity) throw new Error(`unknown entity "${key}"`);
  return entity;
}

export function columnMeta(database: DatabaseName, table: string, column: string) {
  const meta = tableMeta(database, table);
  const col = meta.columns.find((c) => c.name.toLowerCase() === column.toLowerCase());
  if (!col) throw new Error(`unknown column ${database}.${table}.${column}`);
  return col;
}
