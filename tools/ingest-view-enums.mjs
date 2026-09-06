#!/usr/bin/env node
/**
 * Wyrmrest Editor — enum extraction from helper views.
 *
 * The shipped world dump defines "…_with_labels" views whose CASE expressions
 * enumerate TrinityCore's own constants, e.g.
 *
 *   case `smart_scripts`.`event_type` when 0 then 'SMART_EVENT_UPDATE_IC' … end AS `event_type`
 *   case when (`conditions`.`SourceTypeOrReferenceId` = 1) then 'CONDITION_SOURCE_TYPE_…' … end
 *
 * Those are authoritative for the exact core revision the databases came from,
 * so we mine them into value sets for the editors.
 *
 * Output: resources/metadata/derived/view-enums.json
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { SOURCES } from './ingest-schema.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'resources', 'metadata', 'derived', 'view-enums.json');

/** Split on top level commas (ignoring parens / quotes). */
function splitTopLevel(input) {
  const out = [];
  let depth = 0;
  let quote = null;
  let cur = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      cur += ch;
      if (ch === '\\') cur += input[++i] ?? '';
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '`') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function extractFromView(sql) {
  const results = [];
  const baseTable = [...sql.matchAll(/from\s+\(*`([A-Za-z0-9_]+)`/gi)].map((m) => m[1]).pop() ?? null;
  const selectBody = sql.replace(/^[\s\S]*?\bselect\b/i, '').replace(/\bfrom\b[\s\S]*$/i, '');

  for (const item of splitTopLevel(selectBody)) {
    const aliasMatch = /\bAS\s+`([A-Za-z0-9_]+)`\s*$/i.exec(item.trim());
    if (!aliasMatch) continue;
    const alias = aliasMatch[1];
    if (!/\bcase\b/i.test(item)) continue;

    const values = [];
    const seen = new Set();
    let sourceColumn = null;

    // form A: case `t`.`col` when 0 then 'NAME'
    const simple = /case\s+`[A-Za-z0-9_]+`\.`([A-Za-z0-9_]+)`/i.exec(item);
    if (simple) sourceColumn = simple[1];
    for (const m of item.matchAll(/when\s+(-?\d+)\s+then\s+'((?:[^'\\]|\\.|'')*)'/gi)) {
      const value = Number(m[1]);
      if (seen.has(value)) continue;
      seen.add(value);
      values.push({ value, name: m[2].replace(/\\'/g, "'") });
    }
    // form B: case when (`t`.`col` = 0) then 'NAME'
    for (const m of item.matchAll(
      /when\s*\(\s*`[A-Za-z0-9_]+`\.`([A-Za-z0-9_]+)`\s*=\s*(-?\d+)\s*\)\s*then\s*'((?:[^'\\]|\\.|'')*)'/gi,
    )) {
      sourceColumn ??= m[1];
      const value = Number(m[2]);
      if (seen.has(value)) continue;
      seen.add(value);
      values.push({ value, name: m[3].replace(/\\'/g, "'") });
    }

    if (values.length < 2) continue;
    values.sort((a, b) => a.value - b.value);
    results.push({ table: baseTable, column: alias, sourceColumn, values });
  }
  return results;
}

function main() {
  const out = {};
  let total = 0;

  for (const { db, file } of SOURCES) {
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) continue;
    const sql = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');

    for (const m of sql.matchAll(/CREATE\s+(?:ALGORITHM[\s\S]*?)?VIEW\s+`([A-Za-z0-9_]+)`\s+AS\s+([\s\S]*?);\s*\n/gi)) {
      const viewName = m[1];
      for (const { table, column, sourceColumn, values } of extractFromView(m[2])) {
        if (!table) continue;
        out[db] ??= {};
        out[db][table] ??= {};
        // Prefer the alias, but keep the labelled source column too — the
        // shipped conditions view labels several columns from one source.
        out[db][table][column] = { kind: 'enum', origin: viewName, sourceColumn, values };
        total++;
      }
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ databases: out }));
  for (const [db, tables] of Object.entries(out)) {
    for (const [table, cols] of Object.entries(tables)) {
      console.log(
        `${db}.${table}: ${Object.entries(cols)
          .map(([c, v]) => `${c}(${v.values.length})`)
          .join(' ')}`,
      );
    }
  }
  console.log(`${total} value sets mined from views`);
}

main();
