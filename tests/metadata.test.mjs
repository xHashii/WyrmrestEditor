import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Guards the generated metadata: the app is only as good as this artefact, and
 * a stale or broken build must fail loudly rather than half-render.
 */

const META = path.join(process.cwd(), 'resources', 'metadata');
const DBS = ['auth', 'characters', 'world', 'hotfixes'];
const index = JSON.parse(fs.readFileSync(path.join(META, 'index.json'), 'utf8'));
const tables = Object.fromEntries(
  DBS.map((db) => [db, JSON.parse(fs.readFileSync(path.join(META, 'tables', `${db}.json`), 'utf8')).tables]),
);

test('every dumped table is present with its columns', () => {
  const expected = { auth: 32, characters: 107, world: 251, hotfixes: 376 };
  for (const db of DBS) {
    assert.equal(tables[db].length, expected[db], `${db} table count`);
    for (const table of tables[db]) {
      assert.ok(table.columns.length > 0, `${db}.${table.name} has columns`);
      assert.ok(table.label, `${db}.${table.name} has a label`);
      assert.ok(table.category, `${db}.${table.name} has a category`);
    }
  }
});

test('identity columns can address a row for UPDATE/DELETE', () => {
  for (const db of DBS) {
    for (const table of tables[db]) {
      if (table.isView) continue;
      for (const column of table.identityColumns) {
        assert.ok(
          table.columns.some((c) => c.name === column),
          `${db}.${table.name} identity column ${column} exists`,
        );
      }
    }
  }
});

test('every reference points at a real table and column', () => {
  const byName = Object.fromEntries(
    DBS.map((db) => [db, new Map(tables[db].map((t) => [t.name.toLowerCase(), t]))]),
  );
  let count = 0;
  for (const db of DBS) {
    for (const table of tables[db]) {
      for (const column of table.columns) {
        const ref = column.reference;
        if (!ref) continue;
        count++;
        const target = byName[ref.database]?.get(ref.table.toLowerCase());
        assert.ok(target, `${db}.${table.name}.${column.name} -> ${ref.database}.${ref.table} exists`);
        assert.ok(
          target.columns.some((c) => c.name === ref.column),
          `${db}.${table.name}.${column.name} -> ${ref.table}.${ref.column} exists`,
        );
      }
    }
  }
  assert.ok(count > 400, `expected a healthy number of ID pickers, found ${count}`);
});

test('entity pickers resolve to real id and name columns', () => {
  const entities = Object.values(index.entities);
  assert.ok(entities.length >= 40, 'entities are registered');
  for (const entity of entities) {
    const target = tables[entity.database].find((t) => t.name === entity.table);
    assert.ok(target, `entity ${entity.key} table exists`);
    assert.ok(
      target.columns.some((c) => c.name === entity.idColumn),
      `entity ${entity.key} id column exists`,
    );
    for (const name of entity.nameColumns) {
      assert.ok(
        target.columns.some((c) => c.name === name),
        `entity ${entity.key} name column ${name} exists`,
      );
    }
  }
  // The pickers the brief calls out explicitly.
  for (const key of [
    'creature',
    'gameobject',
    'quest',
    'spell',
    'item',
    'faction',
    'map',
    'sound',
    'emote',
    'broadcastText',
    'gossipMenu',
    'creatureLoot',
  ]) {
    assert.ok(index.entities[key], `entity "${key}" is registered`);
  }
});

test('value sets are well formed', () => {
  for (const db of DBS) {
    for (const table of tables[db]) {
      for (const column of table.columns) {
        if (!column.valueSet) continue;
        assert.ok(['enum', 'flags'].includes(column.valueSet.kind));
        assert.ok(column.valueSet.values.length > 0);
        for (const entry of column.valueSet.values) {
          assert.ok(entry.name, `${table.name}.${column.name} value has a name`);
          assert.ok(entry.value !== undefined, `${table.name}.${column.name} value has a value`);
        }
      }
    }
  }
});

test('key TrinityCore columns get the right editors', () => {
  const world = new Map(tables.world.map((t) => [t.name, t]));
  const col = (table, name) => world.get(table).columns.find((c) => c.name === name);

  assert.equal(col('creature_template', 'npcflag').editor, 'flags');
  assert.equal(col('creature_template', 'unit_flags').editor, 'flags');
  assert.equal(col('creature_template', 'type').editor, 'enum');
  assert.equal(col('creature_template', 'faction').editor, 'reference');
  assert.equal(col('creature_template', 'faction').reference.database, 'hotfixes');
  assert.equal(col('creature', 'id').reference.table, 'creature_template');
  assert.equal(col('creature', 'map').reference.entity, 'map');
  assert.equal(col('smart_scripts', 'event_type').editor, 'enum');
  assert.ok(col('smart_scripts', 'action_type').valueSet.values.length > 100);
  assert.equal(col('conditions', 'ConditionTypeOrReference').editor, 'enum');
  assert.equal(col('gossip_menu_option', 'MenuID').reference.table, 'gossip_menu');
  assert.equal(col('quest_template', 'RewardItem1').reference.entity, 'item');
  assert.equal(col('creature_loot_template', 'Item').reference.entity, 'item');
});

test('documentation coverage stays high', () => {
  for (const db of DBS) {
    const columns = tables[db].flatMap((t) => t.columns);
    const documented = columns.filter((c) => c.hint || c.description).length;
    const ratio = documented / columns.length;
    assert.ok(ratio > 0.8, `${db}: only ${(ratio * 100).toFixed(1)}% of columns documented`);
  }
});

test('read-only tables are marked so the editor refuses writes', () => {
  const views = tables.world.filter((t) => t.name.startsWith('vw_'));
  assert.ok(views.length > 0);
  for (const view of views) assert.equal(view.readOnly, true);
});
