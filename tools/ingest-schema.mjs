#!/usr/bin/env node
/**
 * Wyrmrest Editor — schema ingestion.
 *
 * Parses the schema-only MySQL dumps that ship in the repository root
 * (auth / characters / world / hotfixes) and emits exact structural metadata
 * for every table: columns, raw + normalised types, signedness, lengths,
 * nullability, defaults, auto increment, enum/set members, primary keys,
 * unique keys, secondary indexes and declared foreign keys.
 *
 * Output: resources/metadata/schema/<db>.json  (+ index.json)
 *
 * The parser is intentionally dependency free so it can run in CI before
 * anything is installed.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'resources', 'metadata', 'schema');

/** Dump file -> logical database name. */
export const SOURCES = [
  { db: 'auth', file: 'auth_database.sql' },
  { db: 'characters', file: 'characters_database.sql' },
  { db: 'world', file: 'world.sql' },
  { db: 'hotfixes', file: 'hotfixes_database.sql' },
];

const INT_TYPES = {
  tinyint: 1,
  smallint: 2,
  mediumint: 3,
  int: 4,
  integer: 4,
  bigint: 8,
};
const FLOAT_TYPES = new Set(['float', 'double', 'real', 'decimal', 'numeric', 'dec']);
const TEXT_TYPES = new Set(['char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'json']);
const BINARY_TYPES = new Set(['binary', 'varbinary', 'tinyblob', 'blob', 'mediumblob', 'longblob']);
const TIME_TYPES = new Set(['date', 'datetime', 'timestamp', 'time', 'year']);

function classify(baseType) {
  if (baseType in INT_TYPES) return 'integer';
  if (baseType === 'bit') return 'integer';
  if (FLOAT_TYPES.has(baseType)) return 'float';
  if (TEXT_TYPES.has(baseType)) return 'string';
  if (BINARY_TYPES.has(baseType)) return 'binary';
  if (TIME_TYPES.has(baseType)) return 'datetime';
  if (baseType === 'enum') return 'enum';
  if (baseType === 'set') return 'set';
  return 'string';
}

/** Inclusive [min, max] for integer columns, used for validation in the UI. */
function intRange(baseType, unsigned) {
  const bytes = INT_TYPES[baseType];
  if (!bytes) return null;
  const bits = BigInt(bytes * 8);
  if (unsigned) return { min: '0', max: (2n ** bits - 1n).toString() };
  const half = 2n ** (bits - 1n);
  return { min: (-half).toString(), max: (half - 1n).toString() };
}

/** Split a comma separated list, honouring backticks and quotes. */
function splitList(input) {
  const out = [];
  let depth = 0;
  let quote = null;
  let cur = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      cur += ch;
      if (ch === '\\') {
        cur += input[++i] ?? '';
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const unquoteSql = (s) => s.replace(/^'(.*)'$/s, '$1').replace(/\\'/g, "'").replace(/''/g, "'");
const unbacktick = (s) => s.trim().replace(/^`(.*)`$/s, '$1');

/** Parse `(`col`(10) ASC, `col2`)` style key column lists. */
function parseKeyColumns(raw) {
  return splitList(raw).map((part) => {
    const m = /^`([^`]+)`(?:\((\d+)\))?/.exec(part.trim());
    return m ? m[1] : unbacktick(part.split('(')[0]);
  });
}

function parseColumn(line, ordinal) {
  const m = /^`([^`]+)`\s+([A-Za-z]+)(?:\s*\(([^)]*)\))?\s*(.*)$/s.exec(line);
  if (!m) return null;
  const [, name, typeWordRaw, args, restRaw] = m;
  const baseType = typeWordRaw.toLowerCase();
  const rest = ` ${restRaw} `;
  const upper = rest.toUpperCase();

  const unsigned = /\sUNSIGNED\s/.test(upper);
  const zerofill = /\sZEROFILL\s/.test(upper);
  // `NOT NULL` wins; a bare column with no nullability clause is nullable.
  const nullable = !/\sNOT\s+NULL\s/.test(upper);
  const autoIncrement = /\sAUTO_INCREMENT\s/.test(upper);
  const onUpdateCurrentTimestamp = /\sON\s+UPDATE\s+CURRENT_TIMESTAMP/.test(upper);

  let defaultValue = null;
  let hasDefault = false;
  const defMatch = /\sDEFAULT\s+('(?:[^'\\]|\\.|'')*'|\(.*?\)|[^\s,]+)/i.exec(rest);
  if (defMatch) {
    hasDefault = true;
    const raw = defMatch[1];
    if (/^'/.test(raw)) defaultValue = unquoteSql(raw);
    else if (/^null$/i.test(raw)) defaultValue = null;
    else defaultValue = raw;
  }

  let comment = '';
  const cm = /\sCOMMENT\s+('(?:[^'\\]|\\.|'')*')/i.exec(rest);
  if (cm) comment = unquoteSql(cm[1]);

  const collate = /\sCOLLATE\s+([A-Za-z0-9_]+)/i.exec(rest)?.[1] ?? null;
  const charset = /\sCHARACTER\s+SET\s+([A-Za-z0-9_]+)/i.exec(rest)?.[1] ?? null;

  let length = null;
  let precision = null;
  let scale = null;
  let members = null;
  if (args != null) {
    if (baseType === 'enum' || baseType === 'set') {
      members = splitList(args).map((v) => unquoteSql(v.trim()));
    } else if (args.includes(',')) {
      const [p, s] = args.split(',').map((v) => Number(v.trim()));
      precision = Number.isFinite(p) ? p : null;
      scale = Number.isFinite(s) ? s : null;
    } else {
      const n = Number(args.trim());
      length = Number.isFinite(n) ? n : null;
    }
  }

  const kind = classify(baseType);
  const rawType =
    baseType +
    (args != null ? `(${args})` : '') +
    (unsigned ? ' unsigned' : '') +
    (zerofill ? ' zerofill' : '');

  return {
    name,
    ordinal,
    baseType,
    rawType,
    kind,
    unsigned,
    length,
    precision,
    scale,
    members,
    nullable,
    hasDefault,
    default: defaultValue,
    autoIncrement,
    onUpdateCurrentTimestamp,
    comment,
    charset,
    collate,
    range: kind === 'integer' ? intRange(baseType, unsigned) : null,
    // tinyint(1) is MySQL's canonical boolean; TrinityCore uses tinyint(3)
    // unsigned for booleans too, so the docs overlay can widen this later.
    isBool: baseType === 'tinyint' && length === 1,
  };
}

function parseTableBody(body) {
  const columns = [];
  const uniqueKeys = [];
  const indexes = [];
  const foreignKeys = [];
  let primaryKey = [];

  for (const rawItem of splitList(body)) {
    const item = rawItem.replace(/\s+/g, ' ').trim();
    if (!item) continue;
    const upper = item.toUpperCase();

    if (upper.startsWith('PRIMARY KEY')) {
      primaryKey = parseKeyColumns(/\((.*)\)/s.exec(item)?.[1] ?? '');
      continue;
    }
    if (upper.startsWith('UNIQUE KEY') || upper.startsWith('UNIQUE INDEX')) {
      const m = /^UNIQUE\s+(?:KEY|INDEX)\s+(?:`([^`]+)`\s*)?\((.*?)\)(?:\s+USING\s+\w+)?$/is.exec(item);
      if (m) uniqueKeys.push({ name: m[1] ?? null, columns: parseKeyColumns(m[2]) });
      continue;
    }
    if (upper.startsWith('CONSTRAINT') || upper.startsWith('FOREIGN KEY')) {
      const m =
        /(?:CONSTRAINT\s+`([^`]+)`\s+)?FOREIGN\s+KEY\s*(?:`[^`]+`\s*)?\((.*?)\)\s*REFERENCES\s+`([^`]+)`\s*\((.*?)\)(.*)$/is.exec(
          item,
        );
      if (m) {
        const tail = (m[5] || '').toUpperCase();
        foreignKeys.push({
          name: m[1] ?? null,
          columns: parseKeyColumns(m[2]),
          refTable: m[3],
          refColumns: parseKeyColumns(m[4]),
          onDelete: /ON DELETE (CASCADE|SET NULL|RESTRICT|NO ACTION)/.exec(tail)?.[1] ?? null,
          onUpdate: /ON UPDATE (CASCADE|SET NULL|RESTRICT|NO ACTION)/.exec(tail)?.[1] ?? null,
        });
      }
      continue;
    }
    if (/^(FULLTEXT|SPATIAL)?\s*(KEY|INDEX)\s/i.test(item)) {
      const m = /^(FULLTEXT|SPATIAL)?\s*(?:KEY|INDEX)\s+(?:`([^`]+)`\s*)?\((.*?)\)(?:\s+USING\s+\w+)?$/is.exec(item);
      if (m) {
        indexes.push({
          name: m[2] ?? null,
          columns: parseKeyColumns(m[3]),
          type: m[1] ? m[1].toUpperCase() : 'BTREE',
        });
      }
      continue;
    }
    if (item.startsWith('`')) {
      const col = parseColumn(rawItem.trim(), columns.length);
      if (col) columns.push(col);
    }
  }

  return { columns, primaryKey, uniqueKeys, indexes, foreignKeys };
}

export function parseDump(sql, fallbackDb) {
  const text = sql.replace(/\r\n/g, '\n');
  const tables = [];
  const re = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+`([^`]+)`\s*\(/gi;
  let m;
  while ((m = re.exec(text))) {
    const tableName = m[1];
    // Walk to the matching closing paren of the definition block.
    let i = re.lastIndex;
    let depth = 1;
    let quote = null;
    while (i < text.length && depth > 0) {
      const ch = text[i];
      if (quote) {
        if (ch === '\\') i++;
        else if (ch === quote) quote = null;
      } else if (ch === "'" || ch === '"' || ch === '`') quote = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') depth--;
      i++;
    }
    const body = text.slice(re.lastIndex, i - 1);
    const tail = text.slice(i, text.indexOf(';', i) === -1 ? i : text.indexOf(';', i));

    // The dump emits "-- Dumping structure for table <db>.<table>" headers.
    const headerSlice = text.slice(Math.max(0, m.index - 300), m.index);
    const dbFromHeader = /--\s*Dumping structure for (?:table|view)\s+([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)/i.exec(
      headerSlice,
    );

    const parsed = parseTableBody(body);
    tables.push({
      name: tableName,
      database: dbFromHeader?.[1] ?? fallbackDb,
      engine: /ENGINE=(\w+)/i.exec(tail)?.[1] ?? null,
      charset: /DEFAULT CHARSET=([\w]+)/i.exec(tail)?.[1] ?? null,
      collate: /COLLATE=([\w]+)/i.exec(tail)?.[1] ?? null,
      autoIncrement: /AUTO_INCREMENT=(\d+)/i.exec(tail)?.[1] ?? null,
      comment: (() => {
        const c = /COMMENT='((?:[^'\\]|\\.|'')*)'/i.exec(tail);
        return c ? unquoteSql(`'${c[1]}'`) : '';
      })(),
      ...parsed,
    });
    re.lastIndex = i;
  }
  return tables;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const index = [];
  let grandColumns = 0;

  for (const { db, file } of SOURCES) {
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) {
      console.warn(`! missing dump for ${db}: ${file} — skipped`);
      continue;
    }
    const sql = fs.readFileSync(abs, 'utf8');
    const tables = parseDump(sql, db).sort((a, b) => a.name.localeCompare(b.name));
    const columnCount = tables.reduce((n, t) => n + t.columns.length, 0);
    grandColumns += columnCount;

    const payload = {
      database: db,
      source: file,
      // Deterministic: a content hash, not a timestamp, so CI can detect
      // genuinely stale metadata with a plain `git diff`.
      sourceHash: crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16),
      tableCount: tables.length,
      columnCount,
      tables,
    };
    const out = path.join(OUT_DIR, `${db}.json`);
    fs.writeFileSync(out, JSON.stringify(payload));
    const noPk = tables.filter((t) => t.primaryKey.length === 0).length;
    console.log(
      `${db.padEnd(11)} ${String(tables.length).padStart(4)} tables  ${String(columnCount).padStart(5)} columns  ` +
        `${String(noPk).padStart(3)} without PK  -> ${path.relative(ROOT, out)}`,
    );
    index.push({
      database: db,
      source: file,
      sourceHash: payload.sourceHash,
      tableCount: tables.length,
      columnCount,
      tablesWithoutPk: noPk,
    });
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'index.json'),
    JSON.stringify({ databases: index }, null, 2),
  );
  console.log(`total columns: ${grandColumns}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(url.fileURLToPath(import.meta.url))) {
  main();
}
