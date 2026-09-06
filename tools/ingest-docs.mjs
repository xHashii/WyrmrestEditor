#!/usr/bin/env node
/**
 * Wyrmrest Editor — TrinityCore documentation ingestion.
 *
 * Reads the markdown backup of https://trinitycore.info (TrinityCore/tc-wiki)
 * from .docs-cache/database/{335,master}/{auth,characters,world,hotfixes} and
 * turns it into structured, machine usable metadata:
 *
 *   - table descriptions
 *   - per column prose + short hint
 *   - enum tables      ( | ID | Name | )               -> dropdown editors
 *   - flag tables      ( | Value | Flag | Name | ... ) -> bitmask editors
 *   - cross references ( [entry](../world/creature_template#entry) ) -> ID pickers
 *   - DBC references   ( [Map ID](/files/DBC/335/map#id) )
 *
 * Output: resources/metadata/docs/<db>.json
 *
 * Run `node tools/fetch-docs.mjs` first to populate the cache.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, '.docs-cache', 'database');
const OUT_DIR = path.join(ROOT, 'resources', 'metadata', 'docs');

const DBS = ['auth', 'characters', 'world', 'hotfixes'];
// 3.4.3 (Wrath Classic) sits between the two documented branches: 335 is the
// closer match for gameplay tables, master documents everything else.
const VARIANT_PRIORITY = ['335', 'master'];

const slug = (s) =>
  s
    .trim()
    .toLowerCase()
    .replace(/<!--.*?-->/g, '')
    .replace(/[`*]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');

function stripFrontmatter(md) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(md);
  if (!m) return { meta: {}, body: md };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const mm = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
    if (mm) meta[mm[1]] = mm[2].trim();
  }
  return { meta, body: md.slice(m[0].length) };
}

/** Remove wiki chrome: nav buttons, layout hints, nbsp padding. */
function cleanBody(body) {
  return body
    .replace(/<a href="[^"]*"[^>]*class="[^"]*v-btn[^"]*"[\s\S]*?<\/a>/g, '')
    .replace(/&nbsp;&nbsp;&nbsp;/g, '')
    .replace(/^\s*&nbsp;\s*$/gm, '')
    .replace(/\{\.(dense|links-list|is-warning|is-info|is-success|is-danger|grid-list)\}/g, '');
}

function parseMarkdownTables(section) {
  const lines = section.split('\n');
  const tables = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i])) continue;
    const sep = lines[i + 1];
    if (!sep || !/^\s*\|[\s:|-]+\|?\s*$/.test(sep)) continue;
    const header = lines[i]
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());
    const rows = [];
    let j = i + 2;
    for (; j < lines.length && /^\s*\|/.test(lines[j]); j++) {
      const cells = lines[j]
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim());
      rows.push(cells);
    }
    tables.push({ header, rows, start: i, end: j });
    i = j;
  }
  return tables;
}

const stripMd = (s) =>
  s
    // Wiki authors escape underscores in constant names (UNIT\_FLAG\_...).
    .replace(/\\([_*`[\]])/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function parseNumber(raw) {
  const t = stripMd(raw).replace(/,/g, '');
  if (/^0x[0-9a-f]+$/i.test(t)) return Number.parseInt(t, 16);
  if (/^-?\d+$/.test(t)) return Number.parseInt(t, 10);
  return null;
}

const isPow2 = (n) => n > 0 && (n & (n - 1)) === 0;

/**
 * Turn a documentation table into a value set usable by the UI.
 * Heuristics mirror how the wiki authors write them:
 *   | Value | Flag | Name | Comment |  -> bit flags
 *   | ID | Name | (| Comment |)        -> enumeration
 */
function tableToValueSet(tbl) {
  const head = tbl.header.map((h) => stripMd(h).toLowerCase());
  const idxOf = (...names) => head.findIndex((h) => names.includes(h));

  let valueIdx = idxOf('value', 'id', 'bit', 'type', 'index', 'flag value', 'entry');
  const hexIdx = idxOf('flag', 'hex', 'bitmask', 'mask');
  let nameIdx = idxOf('name', 'flag name', 'title', 'constant', 'meaning', 'description');
  const commentIdx = idxOf('comment', 'comments', 'description', 'notes', 'note');

  if (valueIdx === -1 && hexIdx !== -1) valueIdx = hexIdx;
  if (valueIdx === -1) return null;
  if (nameIdx === valueIdx) nameIdx = -1;
  if (nameIdx === -1) {
    // Fall back to the first textual column that is not the value/hex column.
    nameIdx = head.findIndex((_, i) => i !== valueIdx && i !== hexIdx);
  }
  if (nameIdx === -1) return null;

  const values = [];
  for (const row of tbl.rows) {
    if (row.length < 2) continue;
    const value = parseNumber(row[valueIdx] ?? '');
    if (value === null) continue;
    const name = stripMd(row[nameIdx] ?? '');
    if (!name) continue;
    const comment = commentIdx !== -1 && commentIdx !== nameIdx ? stripMd(row[commentIdx] ?? '') : '';
    values.push({ value, name, ...(comment ? { comment } : {}) });
  }
  if (values.length < 2) return null;

  const nonZero = values.filter((v) => v.value > 0);
  const looksLikeFlags =
    hexIdx !== -1 ||
    head.includes('flag') ||
    (nonZero.length >= 2 && nonZero.every((v) => isPow2(v.value)) && nonZero.some((v) => v.value > 2));

  return { kind: looksLikeFlags ? 'flags' : 'enum', values };
}

const LINK_RE = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function extractReferences(section, db) {
  const refs = [];
  const dbcRefs = [];
  let m;
  while ((m = LINK_RE.exec(section))) {
    const target = m[2];
    const dbc = /\/files\/DBC\/(?:335|master|[\d.]+)\/([A-Za-z0-9_-]+?)(?:#([A-Za-z0-9_-]+))?$/.exec(target);
    if (dbc) {
      dbcRefs.push({ dbc: dbc[1], column: dbc[2] ?? null, label: stripMd(m[1]) });
      continue;
    }
    const tbl =
      /(?:^|\/|\.\.\/)(auth|characters|world|hotfixes)\/([A-Za-z0-9_]+)(?:#([A-Za-z0-9_-]+))?$/.exec(target) ??
      /^\.\/?([A-Za-z0-9_]+)(?:#([A-Za-z0-9_-]+))?$/.exec(target);
    if (!tbl) continue;
    if (tbl.length === 4) {
      if (tbl[2] === 'home') continue;
      refs.push({ database: tbl[1], table: tbl[2], anchor: tbl[3] ?? null, label: stripMd(m[1]) });
    } else {
      if (tbl[1] === 'home') continue;
      refs.push({ database: db, table: tbl[1], anchor: tbl[2] ?? null, label: stripMd(m[1]) });
    }
  }
  return { refs, dbcRefs };
}

/** First sentence of the prose, used as an inline hint / tooltip summary. */
function firstSentence(text) {
  const clean = stripMd(text.split('\n').filter((l) => !/^\s*[|>]/.test(l)).join(' '));
  if (!clean) return '';
  const m = /^(.{0,240}?[.!?])(\s|$)/.exec(clean);
  return (m ? m[1] : clean.slice(0, 240)).trim();
}

function parseDocFile(md, db) {
  const { meta, body: rawBody } = stripFrontmatter(md);
  const body = cleanBody(rawBody);

  const structureIdx = body.search(/^##\s+Structure\s*$/m);
  const fieldsIdx = body.search(/^##\s+Description of fields\s*$/m);

  const intro = (structureIdx > 0 ? body.slice(0, structureIdx) : '')
    .split('\n')
    .filter((l) => l.trim() && !/^#/.test(l))
    .join(' ')
    .trim();

  // field -> anchor map from the Structure table
  const anchorByField = new Map();
  const structureComments = new Map();
  if (structureIdx !== -1) {
    const structSection = body.slice(structureIdx, fieldsIdx === -1 ? undefined : fieldsIdx);
    for (const tbl of parseMarkdownTables(structSection)) {
      const head = tbl.header.map((h) => stripMd(h).toLowerCase());
      if (!head.includes('field')) continue;
      const fi = head.indexOf('field');
      const ci = head.indexOf('comment');
      for (const row of tbl.rows) {
        const cell = row[fi] ?? '';
        const link = /\[([^\]]+)\]\(#([^)]+)\)/.exec(cell);
        const field = link ? link[1].trim() : stripMd(cell);
        if (!field) continue;
        anchorByField.set(field, link ? link[2].toLowerCase() : slug(field));
        if (ci !== -1 && row[ci]) structureComments.set(field, stripMd(row[ci]));
      }
    }
  }

  // ### sections keyed by anchor
  const sections = new Map();
  if (fieldsIdx !== -1) {
    const rest = body.slice(fieldsIdx);
    const parts = rest.split(/^###\s+/m).slice(1);
    for (const part of parts) {
      const nl = part.indexOf('\n');
      const heading = (nl === -1 ? part : part.slice(0, nl)).trim();
      const content = nl === -1 ? '' : part.slice(nl + 1).replace(/^##\s+[\s\S]*$/m, '');
      const explicit = /<!--\s*\{#([^}]+)\}\s*-->/.exec(heading);
      const anchor = explicit ? explicit[1].toLowerCase() : slug(heading);
      const title = heading.replace(/<!--[\s\S]*?-->/g, '').trim();
      sections.set(anchor, { title, content });
      // Headings like "KillCredit1-2" or "modelid1-4" also serve single fields.
      if (!explicit) sections.set(slug(title), { title, content });
    }
  }

  const columns = {};
  const fieldNames = anchorByField.size
    ? [...anchorByField.keys()]
    : [...sections.values()].map((s) => s.title).filter(Boolean);

  for (const field of fieldNames) {
    const anchor = anchorByField.get(field) ?? slug(field);
    const section = sections.get(anchor) ?? sections.get(slug(field)) ?? null;
    const content = section?.content ?? '';
    const tables = parseMarkdownTables(content);

    let valueSet = null;
    for (const tbl of tables) {
      const vs = tableToValueSet(tbl);
      if (!vs) continue;
      if (!valueSet) valueSet = vs;
      else valueSet.values.push(...vs.values.filter((v) => !valueSet.values.some((e) => e.value === v.value)));
    }

    // prose = section content minus the value tables
    let prose = content;
    if (tables.length) {
      const lines = content.split('\n');
      const drop = new Set();
      for (const t of tables) for (let i = t.start; i < t.end; i++) drop.add(i);
      prose = lines.filter((_, i) => !drop.has(i)).join('\n');
    }
    prose = prose.replace(/\n{3,}/g, '\n\n').trim();

    const { refs, dbcRefs } = extractReferences(content, db);
    const structComment = structureComments.get(field) ?? '';

    const entry = {};
    if (prose) entry.description = prose;
    const hint = firstSentence(prose) || structComment;
    if (hint) entry.hint = hint;
    if (valueSet) entry.valueSet = valueSet;
    if (refs.length) entry.references = refs;
    if (dbcRefs.length) entry.dbc = dbcRefs;
    if (Object.keys(entry).length) columns[field] = entry;
  }

  return {
    title: meta.title ?? null,
    description: intro || null,
    updated: meta.date ?? null,
    columns,
  };
}

function mergeColumn(base, extra) {
  const out = { ...extra, ...base };
  if (!out.valueSet && extra.valueSet) out.valueSet = extra.valueSet;
  if (base.references || extra.references) {
    const seen = new Set();
    out.references = [...(base.references ?? []), ...(extra.references ?? [])].filter((r) => {
      const k = `${r.database}.${r.table}.${r.anchor ?? ''}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  return out;
}

function main() {
  if (!fs.existsSync(CACHE)) {
    console.error(`documentation cache missing at ${path.relative(ROOT, CACHE)} — run: node tools/fetch-docs.mjs`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const db of DBS) {
    const tables = {};
    const stats = { pages: 0, columns: 0, valueSets: 0, references: 0 };

    // Lower priority first so higher priority overwrites/merges on top.
    const digest = crypto.createHash('sha256');
    for (const variant of [...VARIANT_PRIORITY].reverse()) {
      const dir = path.join(CACHE, variant, db);
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.md') || file === 'home.md') continue;
        const table = file.replace(/\.md$/, '');
        const raw = fs.readFileSync(path.join(dir, file), 'utf8');
        digest.update(`${variant}/${db}/${file}`).update(raw);
        const parsed = parseDocFile(raw, db);
        stats.pages++;
        const prev = tables[table];
        if (!prev) {
          tables[table] = { ...parsed, sources: [`${variant}/${db}/${table}`] };
          continue;
        }
        const columns = { ...prev.columns };
        for (const [col, data] of Object.entries(parsed.columns)) {
          columns[col] = prev.columns[col] ? mergeColumn(data, prev.columns[col]) : data;
        }
        tables[table] = {
          title: parsed.title ?? prev.title,
          description: parsed.description ?? prev.description,
          updated: parsed.updated ?? prev.updated,
          columns,
          sources: [`${variant}/${db}/${table}`, ...prev.sources],
        };
      }
    }

    for (const t of Object.values(tables)) {
      for (const c of Object.values(t.columns)) {
        stats.columns++;
        if (c.valueSet) stats.valueSets++;
        if (c.references) stats.references += c.references.length;
      }
    }

    const out = path.join(OUT_DIR, `${db}.json`);
    fs.writeFileSync(
      out,
      JSON.stringify({ database: db, docsHash: digest.digest('hex').slice(0, 16), tables }),
    );
    console.log(
      `${db.padEnd(11)} ${String(Object.keys(tables).length).padStart(4)} documented tables  ` +
        `${String(stats.columns).padStart(5)} columns  ${String(stats.valueSets).padStart(4)} value sets  ` +
        `${String(stats.references).padStart(5)} refs`,
    );
  }
}

main();
