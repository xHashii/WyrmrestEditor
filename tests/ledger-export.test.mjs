import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.WYRMREST_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-test-'));

const { Ledger } = await import('../dist/node/core/ledger.js');
const { renderChange, renderUpdate, formatValue, escapeString } = await import('../dist/node/core/sql.js');
const { nextFileName, renderChanges, exportChanges } = await import('../dist/node/core/export.js');
const { tableMeta, metadataIndex } = await import('../dist/node/core/metadata.js');

test('escapes values per column type', () => {
  const meta = tableMeta('world', 'creature_template');
  const name = meta.columns.find((c) => c.name === 'name');
  const entry = meta.columns.find((c) => c.name === 'entry');
  assert.equal(formatValue(name, "Hogger's Lair"), "'Hogger\\'s Lair'");
  assert.equal(formatValue(entry, '448'), '448');
  assert.equal(formatValue(entry, null), 'NULL');
  assert.equal(escapeString('line\nbreak'), "'line\\nbreak'");
});

test('renders UPDATE only for genuinely changed columns', () => {
  const meta = tableMeta('world', 'creature_template');
  const sql = renderUpdate(
    meta,
    { entry: 448 },
    {
      name: { before: 'Hogger', after: 'Hogger the Terrible' },
      faction: { before: 14, after: 14 },
    },
  );
  assert.equal(sql, "UPDATE `creature_template` SET `name`='Hogger the Terrible' WHERE `entry`=448;");
});

test('inserts are preceded by a DELETE so files are replayable', () => {
  const meta = tableMeta('world', 'creature_queststarter');
  const statements = renderChange(meta, {
    id: '1',
    kind: 'insert',
    database: 'world',
    table: 'creature_queststarter',
    key: { id: 448, quest: 176 },
    values: {},
    snapshot: { id: 448, quest: 176, VerifiedBuild: 0 },
    createdAt: '',
    updatedAt: '',
  });
  assert.deepEqual(statements, [
    'DELETE FROM `creature_queststarter` WHERE `id`=448 AND `quest`=176;',
    'INSERT INTO `creature_queststarter` (`id`, `quest`, `VerifiedBuild`) VALUES (448, 176, 0);',
  ]);
});

test('ledger merges repeated edits and cancels no-op round trips', () => {
  const file = path.join(process.env.WYRMREST_HOME, 'merge.json');
  const ledger = new Ledger(file);
  const base = { kind: 'update', database: 'world', table: 'creature_template', key: { entry: 448 } };

  ledger.stage({ ...base, values: { name: { before: 'Hogger', after: 'Hoggerr' } } });
  ledger.stage({ ...base, values: { name: { before: 'Hoggerr', after: 'Hogger the Terrible' } } });
  let state = ledger.get();
  assert.equal(state.changes.length, 1, 'edits to one row collapse into one change');
  assert.deepEqual(state.changes[0].values.name, { before: 'Hogger', after: 'Hogger the Terrible' });

  ledger.stage({ ...base, values: { faction: { before: 14, after: 35 } } });
  assert.equal(ledger.get().changes[0].values.faction.after, 35);

  // Restoring the original value drops the column, and finally the change.
  ledger.stage({ ...base, values: { faction: { before: 35, after: 14 } } });
  assert.equal(ledger.get().changes[0].values.faction, undefined);
  ledger.stage({ ...base, values: { name: { before: 'Hogger the Terrible', after: 'Hogger' } } });
  assert.equal(ledger.get().changes.length, 0, 'a fully reverted row leaves no change');
});

test('staging a delete over a staged insert cancels both', () => {
  const ledger = new Ledger(path.join(process.env.WYRMREST_HOME, 'cancel.json'));
  const key = { entry: 999999 };
  ledger.stage({
    kind: 'insert',
    database: 'world',
    table: 'creature_template',
    key,
    values: {},
    snapshot: { entry: 999999 },
  });
  assert.equal(ledger.get().changes.length, 1);
  ledger.stage({ kind: 'delete', database: 'world', table: 'creature_template', key });
  assert.equal(ledger.get().changes.length, 0);
});

test('ledger survives a restart', () => {
  const file = path.join(process.env.WYRMREST_HOME, 'persist.json');
  const first = new Ledger(file);
  first.stage({
    kind: 'update',
    database: 'world',
    table: 'creature_template',
    key: { entry: 1 },
    values: { name: { before: 'a', after: 'b' } },
  });
  const second = new Ledger(file);
  assert.equal(second.get().changes.length, 1);
});

test('export file names follow YYYY_MM_DD_NN_<db>.sql and increment', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-export-'));
  const when = new Date(2026, 8, 6);
  assert.equal(nextFileName(dir, 'world', when), '2026_09_06_00_world.sql');
  fs.writeFileSync(path.join(dir, '2026_09_06_00_world.sql'), '');
  assert.equal(nextFileName(dir, 'world', when), '2026_09_06_01_world.sql');
  fs.writeFileSync(path.join(dir, '2026_09_06_01_world.sql'), '');
  assert.equal(nextFileName(dir, 'world', when), '2026_09_06_02_world.sql');
  // a different database keeps its own sequence
  assert.equal(nextFileName(dir, 'characters', when), '2026_09_06_00_characters.sql');
});

test('export writes sql/updates/<db>/<version>/ files grouped per database', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-root-'));
  const changes = [
    {
      id: 'a',
      kind: 'update',
      database: 'world',
      table: 'creature_template',
      key: { entry: 448 },
      values: { name: { before: 'Hogger', after: 'Hogger the Terrible' } },
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'b',
      kind: 'delete',
      database: 'characters',
      table: 'characters',
      key: { guid: 2 },
      values: {},
      createdAt: '',
      updatedAt: '',
    },
  ];
  const result = exportChanges(changes, { root, version: '3.4.3', author: 'tester' });
  assert.equal(result.files.length, 2);
  const world = result.files.find((f) => f.database === 'world');
  assert.match(world.relativePath, /^sql\/updates\/world\/3\.4\.3\/\d{4}_\d{2}_\d{2}_\d{2}_world\.sql$/);
  assert.ok(fs.existsSync(world.path));
  const sql = fs.readFileSync(world.path, 'utf8');
  assert.match(sql, /Wyrmrest Editor/);
  assert.match(sql, /Author {3}: tester/);
  assert.match(sql, /UPDATE `creature_template` SET `name`='Hogger the Terrible' WHERE `entry`=448;/);

  const characters = result.files.find((f) => f.database === 'characters');
  assert.match(characters.sql, /DELETE FROM `characters` WHERE `guid`=2;/);
});

test('dry runs never touch the filesystem', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-dry-'));
  const result = exportChanges(
    [
      {
        id: 'a',
        kind: 'update',
        database: 'world',
        table: 'creature_template',
        key: { entry: 1 },
        values: { name: { before: 'x', after: 'y' } },
        createdAt: '',
        updatedAt: '',
      },
    ],
    { root, version: '3.4.3', author: '', dryRun: true },
  );
  assert.equal(result.dryRun, true);
  assert.ok(result.files[0].sql.includes('UPDATE'));
  assert.equal(fs.existsSync(path.join(root, 'sql')), false);
});

test('renderChanges groups statements per table with a header', () => {
  const { sql } = renderChanges(
    'world',
    [
      {
        id: 'a',
        kind: 'update',
        database: 'world',
        table: 'creature_template',
        key: { entry: 448 },
        values: { faction: { before: 14, after: 35 } },
        note: 'make Hogger friendly',
        createdAt: '',
        updatedAt: '',
      },
    ],
    '3.4.3',
    '',
  );
  assert.match(sql, /-- creature_template \(Creature templates\)/);
  assert.match(sql, /-- make Hogger friendly/);
  assert.match(sql, /UPDATE `creature_template` SET `faction`=35 WHERE `entry`=448;/);
});
