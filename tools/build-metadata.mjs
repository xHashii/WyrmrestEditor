#!/usr/bin/env node
/**
 * Wyrmrest Editor — metadata build.
 *
 * Fuses the four inputs into the single artefact the application consumes:
 *
 *   resources/metadata/schema/*.json   exact structure parsed from the dumps
 *   resources/metadata/docs/*.json     TrinityCore wiki prose / enums / links
 *   resources/metadata/derived/*.json  enums mined from the shipped views
 *   tools/overlay/index.mjs            curated entity pickers & groupings
 *
 * Output:
 *   resources/metadata/tables/<db>.json   full per table metadata
 *   resources/metadata/index.json         lightweight catalogue for the sidebar
 *
 * The build fails if the overlay references a table or column that does not
 * exist in the parsed schema, so curated knowledge can never drift silently.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import {
  CATEGORY_RULES,
  COLUMN_RULES,
  ENTITIES,
  FEATURED_TABLES,
  READ_ONLY_PATTERNS,
  TABLE_OVERRIDES,
  VALUE_SETS,
} from './overlay/index.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const META = path.join(ROOT, 'resources', 'metadata');
const OUT_DIR = path.join(META, 'tables');
const DBS = ['auth', 'characters', 'world', 'hotfixes'];

const readJson = (p, fallback = null) =>
  fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback;

const errors = [];
const warnings = [];

/** creature_template -> "Creature template"; RewardItem1 -> "Reward item 1" */
function humanize(name) {
  const spaced = name
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d+)$/, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const matches = (pattern, value) =>
  pattern instanceof RegExp ? pattern.test(value) : String(pattern).toLowerCase() === value.toLowerCase();

function categoryFor(db, table) {
  for (const rule of CATEGORY_RULES) {
    if (rule.database !== db) continue;
    if (rule.match.test(table)) return rule.category;
  }
  return 'Other';
}

const NAME_COLUMN_CANDIDATES = [
  'name',
  'Name',
  'LogTitle',
  'Display',
  'Title',
  'comment',
  'Comment',
  'description',
  'Description',
  'Text',
  'ScriptName',
  'AreaName',
  'MapName',
  'groupName',
];

function pickNameColumn(table) {
  for (const cand of NAME_COLUMN_CANDIDATES) {
    const col = table.columns.find((c) => c.name === cand);
    if (col && (col.kind === 'string' || col.kind === 'integer')) return col.name;
  }
  const firstString = table.columns.find((c) => c.kind === 'string' && !/^(ScriptName|StringId)$/.test(c.name));
  return firstString?.name ?? null;
}

function main() {
  const schemas = {};
  const docs = {};
  for (const db of DBS) {
    schemas[db] = readJson(path.join(META, 'schema', `${db}.json`));
    docs[db] = readJson(path.join(META, 'docs', `${db}.json`), { tables: {} });
    if (!schemas[db]) errors.push(`missing schema metadata for ${db} — run tools/ingest-schema.mjs`);
  }
  const viewEnums = readJson(path.join(META, 'derived', 'view-enums.json'), { databases: {} }).databases;
  if (errors.length) {
    for (const e of errors) console.error(`ERROR: ${e}`);
    process.exit(1);
  }

  // ---- lookup structures ---------------------------------------------------
  /** db -> table name (lowercase) -> table */
  const tableIndex = {};
  for (const db of DBS) {
    tableIndex[db] = new Map();
    for (const t of schemas[db].tables) tableIndex[db].set(t.name.toLowerCase(), t);
  }
  const findTable = (db, name) => tableIndex[db]?.get(String(name).toLowerCase()) ?? null;
  const findColumn = (table, name) =>
    table?.columns.find((c) => c.name.toLowerCase() === String(name).toLowerCase()) ?? null;

  // ---- validate curated entities ------------------------------------------
  const entities = {};
  for (const [key, ent] of Object.entries(ENTITIES)) {
    const table = findTable(ent.database, ent.table);
    if (!table) {
      warnings.push(`entity "${key}" -> ${ent.database}.${ent.table} does not exist in these dumps — disabled`);
      continue;
    }
    const idColumn = findColumn(table, ent.idColumn);
    if (!idColumn) {
      warnings.push(`entity "${key}" -> ${ent.database}.${ent.table}.${ent.idColumn} missing — disabled`);
      continue;
    }
    const nameColumns = (ent.nameColumns ?? []).filter((n) => findColumn(table, n)).map((n) => findColumn(table, n).name);
    entities[key] = {
      key,
      label: ent.label,
      icon: ent.icon ?? 'id',
      database: ent.database,
      table: table.name,
      idColumn: idColumn.name,
      nameColumns,
      // Composite-PK DB2 tables (ID + VerifiedBuild) still resolve by ID.
      pk: table.primaryKey,
    };
  }
  /** `${db}.${table}.${idColumn}` -> entity key, for resolving doc links. */
  const entityByTarget = new Map();
  for (const e of Object.values(entities)) {
    entityByTarget.set(`${e.database}.${e.table.toLowerCase()}.${e.idColumn.toLowerCase()}`, e.key);
    entityByTarget.set(`${e.database}.${e.table.toLowerCase()}.*`, e.key);
  }

  // ---- validate curated column rules --------------------------------------
  for (const rule of COLUMN_RULES) {
    if (rule.entity && !ENTITIES[rule.entity]) errors.push(`column rule references unknown entity "${rule.entity}"`);
    if (rule.valueSet && !VALUE_SETS[rule.valueSet]) errors.push(`column rule references unknown value set "${rule.valueSet}"`);
  }
  if (errors.length) {
    for (const e of errors) console.error(`ERROR: ${e}`);
    process.exit(1);
  }

  const ruleFor = (tableName, columnName) => {
    for (const rule of COLUMN_RULES) {
      if (rule.table && !matches(rule.table, tableName)) continue;
      if (!matches(rule.column, columnName)) continue;
      return rule;
    }
    return null;
  };

  const catalogue = [];
  const summary = {};

  for (const db of DBS) {
    const docTables = docs[db].tables ?? {};
    const docIndex = new Map(Object.entries(docTables).map(([k, v]) => [k.toLowerCase(), v]));
    const out = [];
    const stats = { tables: 0, columns: 0, references: 0, valueSets: 0, documented: 0, boolean: 0 };

    for (const table of schemas[db].tables) {
      const doc = docIndex.get(table.name.toLowerCase()) ?? null;
      const docColumns = new Map(Object.entries(doc?.columns ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
      const override = TABLE_OVERRIDES[`${db}.${table.name}`] ?? {};
      const isView = /^vw_/.test(table.name);
      const readOnly = isView || READ_ONLY_PATTERNS.some((p) => p.test(table.name));

      const columns = table.columns.map((col) => {
        const rule = ruleFor(table.name, col.name);
        const docCol = docColumns.get(col.name.toLowerCase()) ?? null;
        const viewSet = viewEnums[db]?.[table.name]?.[col.name] ?? null;

        // ---- value set priority: curated > shipped view > wiki -------------
        let valueSet = null;
        let valueSetSource = null;
        if (rule?.valueSet) {
          valueSet = VALUE_SETS[rule.valueSet];
          valueSetSource = 'curated';
        } else if (viewSet) {
          valueSet = { kind: viewSet.kind, values: viewSet.values };
          valueSetSource = `view:${viewSet.origin}`;
        } else if (docCol?.valueSet) {
          valueSet = docCol.valueSet;
          valueSetSource = 'wiki';
        }
        if (rule?.noValueSet) {
          // Curated opt-out: the documented list belongs to another column, or
          // only applies to some rows, so showing it would be a lie.
          valueSet = null;
          valueSetSource = null;
        }

        // ---- reference priority: curated > declared FK > wiki link ---------
        let reference = null;
        if (rule?.entity && entities[rule.entity]) {
          const ent = entities[rule.entity];
          reference = {
            entity: ent.key,
            database: ent.database,
            table: ent.table,
            column: ent.idColumn,
            source: 'curated',
            ...(rule.self ? { self: true } : {}),
          };
        }
        if (!reference) {
          const fk = table.foreignKeys.find((f) => f.columns.length === 1 && f.columns[0] === col.name);
          if (fk) {
            const target = findTable(db, fk.refTable);
            if (target) {
              const targetCol = findColumn(target, fk.refColumns[0]);
              reference = {
                entity: entityByTarget.get(`${db}.${target.name.toLowerCase()}.${(targetCol?.name ?? '').toLowerCase()}`) ?? null,
                database: db,
                table: target.name,
                column: targetCol?.name ?? fk.refColumns[0],
                source: 'schema-fk',
              };
            }
          }
        }
        if (!reference && col.kind === 'integer' && docCol?.references?.length === 1) {
          // Only trust an unambiguous wiki link that lands on a key column.
          const ref = docCol.references[0];
          const target = findTable(ref.database, ref.table);
          if (target) {
            const anchor = (ref.anchor ?? '').replace(/-(alt|\d+)$/, '');
            const targetCol = anchor
              ? target.columns.find((c) => c.name.toLowerCase() === anchor) ?? null
              : target.primaryKey.length === 1
                ? findColumn(target, target.primaryKey[0])
                : null;
            const isKey =
              targetCol &&
              (target.primaryKey.includes(targetCol.name) ||
                target.uniqueKeys.some((k) => k.columns.includes(targetCol.name)));
            if (isKey) {
              reference = {
                entity:
                  entityByTarget.get(`${ref.database}.${target.name.toLowerCase()}.${targetCol.name.toLowerCase()}`) ??
                  null,
                database: ref.database,
                table: target.name,
                column: targetCol.name,
                source: 'wiki',
              };
            }
          }
        }

        // ---- editor selection ---------------------------------------------
        const looksBoolean =
          col.isBool ||
          (valueSet?.kind === 'enum' &&
            valueSet.values.length === 2 &&
            valueSet.values.every((v) => v.value === 0 || v.value === 1) &&
            valueSet.values.some((v) => /^(yes|true|enabled?)$/i.test(v.name))) ||
          (col.kind === 'integer' &&
            col.baseType === 'tinyint' &&
            /^(is|has|can|allow|enable|disable)[A-Z_]/.test(col.name));

        let editor;
        if (rule?.editor) editor = rule.editor;
        else if (reference) editor = 'reference';
        else if (valueSet?.kind === 'flags') editor = 'flags';
        else if (valueSet?.kind === 'enum') editor = looksBoolean ? 'bool' : 'enum';
        else if (looksBoolean) editor = 'bool';
        else if (col.kind === 'enum' || col.kind === 'set') editor = col.kind === 'set' ? 'flags' : 'enum';
        else if (col.kind === 'integer') editor = 'int';
        else if (col.kind === 'float') editor = 'float';
        else if (col.kind === 'datetime') editor = 'datetime';
        else if (col.kind === 'binary') editor = 'binary';
        else editor = col.length && col.length > 255 ? 'longtext' : 'text';

        if (!valueSet && (col.kind === 'enum' || col.kind === 'set') && col.members) {
          valueSet = {
            kind: col.kind === 'set' ? 'flags' : 'enum',
            values: col.members.map((m, i) => ({ value: col.kind === 'set' ? 1 << i : m, name: m })),
          };
          valueSetSource = 'schema';
        }

        stats.columns++;
        if (reference) stats.references++;
        if (valueSet) stats.valueSets++;
        if (docCol?.hint || docCol?.description) stats.documented++;
        if (editor === 'bool') stats.boolean++;

        return {
          ...col,
          label: humanize(col.name),
          hint: docCol?.hint ?? (col.comment || null),
          description: docCol?.description ?? null,
          docSource: docCol ? 'wiki' : col.comment ? 'schema-comment' : null,
          editor,
          valueSet: valueSet ?? null,
          valueSetSource,
          reference,
          dbc: docCol?.dbc ?? null,
          inPrimaryKey: table.primaryKey.includes(col.name),
          // Keeps the second pass from re-inheriting a set we removed on purpose.
          ...(rule?.noValueSet ? { noValueSet: true } : {}),
        };
      });

      out.push({
        database: db,
        name: table.name,
        label: override.label ?? humanize(table.name),
        category: categoryFor(db, table.name),
        description: doc?.description ?? table.comment ?? null,
        docSources: doc?.sources ?? [],
        engine: table.engine,
        isView,
        readOnly,
        primaryKey: table.primaryKey,
        uniqueKeys: table.uniqueKeys,
        indexes: table.indexes,
        foreignKeys: table.foreignKeys,
        // Row identity for UPDATE/DELETE statements.
        identityColumns: table.primaryKey.length
          ? table.primaryKey
          : table.uniqueKeys[0]?.columns ?? [],
        nameColumn: override.nameColumn ?? pickNameColumn(table),
        autoIncrementColumn: table.columns.find((c) => c.autoIncrement)?.name ?? null,
        columns,
      });
      stats.tables++;

      catalogue.push({
        database: db,
        name: table.name,
        label: override.label ?? humanize(table.name),
        category: categoryFor(db, table.name),
        columns: table.columns.length,
        pk: table.primaryKey,
        readOnly,
        documented: Boolean(doc),
        featured: FEATURED_TABLES.includes(`${db}.${table.name}`),
        description: (doc?.description ?? table.comment ?? '').slice(0, 200) || null,
      });
    }

    // ---- second pass: propagate value sets between identically named columns
    // TrinityCore reuses the same constants across tables (creature.npcflag is
    // creature_template.npcflag, game_event_npcflag.npcflag, …). We only
    // inherit when every documented occurrence agrees, so ambiguous names are
    // left alone.
    const donors = new Map();
    for (const table of out) {
      for (const col of table.columns) {
        if (!col.valueSet || col.valueSetSource === 'schema') continue;
        const key = `${col.name.toLowerCase()}|${col.baseType}`;
        const fingerprint = JSON.stringify(col.valueSet.values.map((v) => [v.value, v.name]));
        const prev = donors.get(key);
        if (!prev) donors.set(key, { valueSet: col.valueSet, fingerprint, from: table.name, ambiguous: false });
        else if (prev.fingerprint !== fingerprint) prev.ambiguous = true;
      }
    }
    for (const table of out) {
      for (const col of table.columns) {
        if (col.valueSet || col.reference || col.noValueSet || col.kind !== 'integer') continue;
        const donor = donors.get(`${col.name.toLowerCase()}|${col.baseType}`);
        if (!donor || donor.ambiguous || donor.from === table.name) continue;
        col.valueSet = donor.valueSet;
        col.valueSetSource = `inherited:${donor.from}`;
        col.editor = donor.valueSet.kind === 'flags' ? 'flags' : 'enum';
        stats.valueSets++;
        stats.inherited = (stats.inherited ?? 0) + 1;
      }
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(OUT_DIR, `${db}.json`),
      JSON.stringify({ database: db, sourceHash: schemas[db].sourceHash ?? null, tables: out }),
    );
    summary[db] = stats;
    console.log(
      `${db.padEnd(11)} ${String(stats.tables).padStart(4)} tables ${String(stats.columns).padStart(5)} cols  ` +
        `${String(stats.documented).padStart(5)} documented  ${String(stats.valueSets).padStart(4)} value sets  ` +
        `${String(stats.references).padStart(4)} pickers  ${String(stats.boolean).padStart(4)} booleans`,
    );
  }

  fs.writeFileSync(
    path.join(META, 'index.json'),
    JSON.stringify({
      sources: Object.fromEntries(DBS.map((db) => [db, schemas[db].sourceHash ?? null])),
      docs: Object.fromEntries(DBS.map((db) => [db, docs[db].docsHash ?? null])),
      databases: DBS.map((db) => ({
        name: db,
        tables: summary[db].tables,
        columns: summary[db].columns,
      })),
      summary,
      entities,
      featured: FEATURED_TABLES,
      tables: catalogue,
    }),
  );

  for (const w of warnings) console.warn(`warning: ${w}`);
  console.log(`entities: ${Object.keys(entities).length} pickers wired`);
}

main();
