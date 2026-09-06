import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDump } from '../tools/ingest-schema.mjs';

const DDL = `
-- Dumping structure for table world.demo_table
CREATE TABLE IF NOT EXISTS \`demo_table\` (
  \`entry\` int unsigned NOT NULL DEFAULT '0',
  \`name\` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'display name',
  \`flags\` bigint unsigned NOT NULL DEFAULT '0',
  \`chance\` float NOT NULL DEFAULT '1.14286',
  \`state\` enum('RELEASED','ARCHIVED') NOT NULL,
  \`optional\` tinyint(1) DEFAULT NULL,
  \`auto\` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (\`entry\`,\`name\`),
  UNIQUE KEY \`uq_auto\` (\`auto\`),
  KEY \`idx_flags\` (\`flags\`) USING BTREE,
  CONSTRAINT \`fk_demo\` FOREIGN KEY (\`entry\`) REFERENCES \`other_table\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Demo';
`;

test('parses columns, keys and types exactly', () => {
  const [table] = parseDump(DDL, 'world');
  assert.equal(table.name, 'demo_table');
  assert.equal(table.database, 'world');
  assert.equal(table.engine, 'InnoDB');
  assert.equal(table.comment, 'Demo');
  assert.deepEqual(table.primaryKey, ['entry', 'name']);
  assert.deepEqual(
    table.uniqueKeys.map((k) => k.columns),
    [['auto']],
  );
  assert.deepEqual(
    table.indexes.map((k) => k.columns),
    [['flags']],
  );
  assert.deepEqual(table.foreignKeys, [
    {
      name: 'fk_demo',
      columns: ['entry'],
      refTable: 'other_table',
      refColumns: ['id'],
      onDelete: 'CASCADE',
      onUpdate: null,
    },
  ]);

  const byName = Object.fromEntries(table.columns.map((c) => [c.name, c]));
  assert.equal(byName.entry.kind, 'integer');
  assert.equal(byName.entry.unsigned, true);
  assert.equal(byName.entry.nullable, false);
  assert.deepEqual(byName.entry.range, { min: '0', max: '4294967295' });

  assert.equal(byName.name.baseType, 'varchar');
  assert.equal(byName.name.length, 64);
  assert.equal(byName.name.comment, 'display name');

  assert.deepEqual(byName.flags.range, { min: '0', max: '18446744073709551615' });
  assert.equal(byName.chance.kind, 'float');
  assert.equal(byName.chance.default, '1.14286');

  assert.deepEqual(byName.state.members, ['RELEASED', 'ARCHIVED']);
  assert.equal(byName.state.kind, 'enum');

  assert.equal(byName.optional.nullable, true);
  assert.equal(byName.optional.isBool, true);
  assert.equal(byName.auto.autoIncrement, true);
});

test('parses every shipped dump without losing tables', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const sources = [
    ['auth', 'auth_database.sql', 32],
    ['characters', 'characters_database.sql', 107],
    ['world', 'world.sql', 251],
    ['hotfixes', 'hotfixes_database.sql', 376],
  ];
  for (const [db, file, expected] of sources) {
    if (!existsSync(file)) continue;
    const tables = parseDump(readFileSync(file, 'utf8'), db);
    assert.equal(tables.length, expected, `${db} table count`);
    for (const table of tables) {
      assert.ok(table.columns.length > 0, `${db}.${table.name} has columns`);
      for (const pk of table.primaryKey) {
        assert.ok(
          table.columns.some((c) => c.name === pk),
          `${db}.${table.name} PK column ${pk} exists`,
        );
      }
    }
  }
});
