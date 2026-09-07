import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.WYRMREST_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-safety-'));
const { WyrmrestService } = await import('../src/core/service.ts');
const { Ledger, stableKey } = await import('../src/core/ledger.ts');
const { DemoDataSource, MySqlDataSource, buildWhere } = await import('../src/core/datasource.ts');
const { tableMeta, allTables } = await import('../src/core/metadata.ts');
const { renderChange, renderUpdate, formatValue } = await import('../src/core/sql.ts');
const { exportChanges, nextFileName, renderChanges } = await import('../src/core/export.ts');
const { defaultRow, parseCellValue, sameValue, insertKey, identityKey } = await import('../src/shared/values.ts');
const meta = tableMeta('world', 'creature_template');
const column = (name) => meta.columns.find((c) => c.name === name);
const update = { kind: 'update', database: 'world', table: meta.name, key: { entry: 448 }, values: { name: { before: 'Hogger', after: 'Hogger edited' } } };
const temp = (t) => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-safety-case-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; };
const serviceFor = (t) => { process.env.WYRMREST_HOME = temp(t); const service = new WyrmrestService(); t.after(() => service.shutdown()); return service; };
const ledgerFor = (t) => new Ledger(path.join(temp(t), 'ledger.json'));

test('demo staging, refreshing, reverting and discarding never mutate source rows', async (t) => {
  const service = serviceFor(t);
  const query = { database: 'world', table: meta.name, filters: [{ column: 'entry', op: '=', value: 448 }] };
  const baseline = await service.query(query);
  const staged = await service.stage(update);
  assert.equal((await service.query(query)).rows[0].name, 'Hogger');
  await service.revert(staged.changes.map((c) => c.id));
  assert.deepEqual((await service.query(query)).rows, baseline.rows);
  await service.stage({ ...update, kind: 'delete', values: undefined, snapshot: baseline.rows[0] });
  await service.clearLedger();
  assert.deepEqual((await service.query(query)).rows, baseline.rows);
  const copy = (await service.query(query)).rows[0];
  copy.name = 'Do not mutate the seed';
  assert.equal((await service.query(query)).rows[0].name, 'Hogger');
});

test('BIGINT input and SQL retain every digit; invalid numbers never become zero', () => {
  assert.equal(parseCellValue(column('npcflag'), '18446744073709551615'), '18446744073709551615');
  assert.equal(formatValue(column('npcflag'), '18446744073709551615'), '18446744073709551615');
  for (const input of ['', '12oops', '1.5', 'Infinity', '-1', '4294967296']) assert.throws(() => parseCellValue(column('entry'), input));
  assert.throws(() => parseCellValue(column('npcflag'), Number.MAX_SAFE_INTEGER + 1), /preserve/);
  assert.throws(() => formatValue(column('entry'), Infinity));
  assert.throws(() => parseCellValue(column('speed_walk'), '1.2oops'));
});

test('NULL, empty strings, zero and BIGINT identities stay distinct', () => {
  assert.equal(sameValue(null, ''), false);
  assert.equal(sameValue(0, ''), false);
  assert.equal(sameValue(false, ''), false);
  assert.equal(sameValue(448, '448'), true);
  assert.equal(sameValue(9007199254740992, '9007199254740993'), false);
  assert.notEqual(identityKey({ a: null }), identityKey({ a: 'NULL' }));
  assert.equal(identityKey({ b: 2, a: 1 }), identityKey({ a: '1', b: '2' }));
  assert.notEqual(stableKey('world', 'x', { a: 'x&b=y', b: 'z' }), stableKey('world', 'x', { a: 'x', b: 'y&b=z' }));
});

test('all 766 table definitions can create JSON-safe default rows', () => {
  for (const db of ['auth', 'characters', 'world', 'hotfixes']) for (const table of allTables(db)) {
    assert.doesNotThrow(() => JSON.stringify(defaultRow(table)), `${db}.${table.name}`);
  }
});

test('ledger ignores new no-op updates, deduplicates deletes, and blocks edits of deleted rows', (t) => {
  const ledger = ledgerFor(t);
  ledger.stage({ ...update, values: { name: { before: 'Hogger', after: 'Hogger' } } });
  assert.equal(ledger.get().changes.length, 0);
  ledger.stage({ ...update, kind: 'delete', values: undefined });
  ledger.stage({ ...update, kind: 'delete', values: undefined });
  assert.equal(ledger.get().changes.length, 1);
  assert.throws(() => ledger.stage(update), /Revert the staged deletion/);
});

test('an explicitly empty selection does not expand to every change', (t) => {
  const ledger = ledgerFor(t);
  ledger.stage(update);
  assert.equal(ledger.select().length, 1);
  assert.deepEqual(ledger.select([]), []);
  assert.deepEqual(ledger.select(['not-a-change']), []);
});

test('key edits of a staged insert keep one change and render DELETE for the final key', async (t) => {
  const service = serviceFor(t);
  let state = await service.stage({ kind: 'insert', database: 'world', table: meta.name, key: { entry: 999998 }, snapshot: { entry: 999998, name: 'New creature' } });
  const id = state.changes[0].id;
  state = await service.stage({ kind: 'insert', changeId: id, database: 'world', table: meta.name, key: { entry: 999999 }, snapshot: { entry: 999999, name: 'Stale snapshot' }, values: { entry: { before: 999998, after: 999999 } } });
  assert.equal(state.changes.length, 1);
  assert.equal(state.changes[0].snapshot.name, 'New creature', 'unrelated values are not replaced by a stale snapshot');
  assert.deepEqual(state.changes[0].key, { entry: 999999 });
  const sql = await service.previewSql();
  assert.match(sql, /DELETE FROM `creature_template` WHERE `entry`=999999;/);
  assert.doesNotMatch(sql, /999998/);
  await service.stage({ kind: 'delete', changeId: id, database: 'world', table: meta.name, key: { entry: 999999 } });
  assert.equal((await service.getLedger()).changes.length, 0);
});

test('auto-increment inserts have independent IDs and never delete key zero', async (t) => {
  const service = serviceFor(t);
  const table = tableMeta('auth', 'account');
  const snapshot = defaultRow(table);
  const key = insertKey(table, snapshot);
  assert.deepEqual(key, {});
  const request = { kind: 'insert', database: 'auth', table: 'account', key, snapshot };
  await service.stage(request);
  const state = await service.stage({ ...request, snapshot: { ...snapshot, username: 'Second account' } });
  assert.equal(state.changes.length, 2);
  assert.notEqual(state.changes[0].id, state.changes[1].id);
  const statements = renderChange(table, state.changes[0]);
  assert.equal(statements.length, 1);
  assert.match(statements[0], /^INSERT/);
  assert.doesNotMatch(statements[0], /`id`/);
  assert.equal(formatValue({ kind: 'binary' }, '0x'), "X''");
});

test('staging rejects collisions, unknown columns, incomplete keys and read-only writes', async (t) => {
  const service = serviceFor(t);
  await assert.rejects(service.stage({ kind: 'insert', database: 'world', table: meta.name, key: { entry: 448 }, snapshot: { entry: 448, name: 'Do not replace Hogger' } }), /already exists/);
  await assert.rejects(service.stage({ ...update, values: { misspelled: { before: 0, after: 1 } } }), /Unknown column/);
  await assert.rejects(service.stage({ ...update, key: {} }), /key columns/);
  await assert.rejects(service.stage({ ...update, table: 'vw_smart_scripts_with_labels' }), /read-only/);
  assert.throws(() => renderUpdate(tableMeta('world', 'creature_queststarter'), { id: 448 }, { quest: { before: 1, after: 2 } }), /all key/);
  assert.equal((await service.getLedger()).changes.length, 0);
});

test('ledger snapshots are isolated and failed disk writes preserve both disk and memory', (t) => {
  const file = path.join(temp(t), 'ledger.json');
  const ledger = new Ledger(file);
  const request = structuredClone(update);
  ledger.stage(request);
  request.values.name.after = 'Changed by caller';
  ledger.get().changes[0].values.name.after = 'Changed through get';
  assert.equal(ledger.get().changes[0].values.name.after, 'Hogger edited');
  const saved = fs.readFileSync(file, 'utf8');
  t.mock.method(fs, 'renameSync', () => { throw new Error('disk unavailable'); });
  assert.throws(() => ledger.clear(), /disk unavailable/);
  assert.equal(ledger.get().changes.length, 1);
  assert.equal(fs.readFileSync(file, 'utf8'), saved);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});

test('demo filters use SQL LIKE syntax safely and empty IN matches nothing', async () => {
  const source = new DemoDataSource();
  const request = { database: 'world', table: meta.name };
  for (const pattern of ['[', '(', '.*', '\\', 'a+b']) {
    const result = await source.query({ ...request, filters: [{ column: 'name', op: 'like', value: pattern }] });
    assert.equal(result.rows.length, 0);
  }
  const result = await source.query({ ...request, filters: [{ column: 'NAME', op: 'like', value: 'H_g%' }] });
  assert.equal(result.rows[0].name, 'Hogger');
  assert.equal((await source.query({ ...request, filters: [{ column: 'entry', op: 'in', value: [] }] })).rows.length, 0);
  assert.match(buildWhere(meta, { ...request, filters: [{ column: 'entry', op: 'in', value: [] }] }).where, /1=0/);
});

test('query pagination and operators are validated; numeric search is not rounded', async () => {
  const source = new DemoDataSource();
  for (const limit of [-1, 0, 1.5, NaN, '1; DROP TABLE x']) await assert.rejects(source.query({ database: 'world', table: meta.name, limit }), /pagination/);
  assert.throws(() => buildWhere(meta, { filters: [{ column: 'entry', op: '= 1 OR 1=1 --', value: 0 }] }), /Unknown filter/);
  assert.ok(buildWhere(meta, { search: '18446744073709551615' }).params.includes('18446744073709551615'));
});

test('live apply rolls back the DELETE if a following INSERT fails', async () => {
  const calls = [];
  const connection = {
    query: async (sql) => { if (sql.startsWith('SELECT ENGINE')) return [[{ engine: 'InnoDB' }]]; calls.push(sql); if (sql === 'INSERT fails') throw new Error('duplicate key'); },
    beginTransaction: async () => calls.push('begin'), commit: async () => calls.push('commit'), rollback: async () => calls.push('rollback'), release: () => calls.push('release'),
  };
  const source = new MySqlDataSource({}, {}, {});
  source.pools.set('world', { getConnection: async () => connection });
  await assert.rejects(source.executeBatch('world', 'creature_template', ['DELETE old', 'INSERT fails']), /duplicate key/);
  assert.deepEqual(calls, ['begin', 'DELETE old', 'INSERT fails', 'rollback', 'release']);
});

test('non-transactional tables are refused before any live statement executes', async () => {
  const calls = [];
  const source = new MySqlDataSource({}, {}, {});
  source.pools.set('world', { getConnection: async () => ({ query: async () => [[{ engine: 'MyISAM' }]], beginTransaction: async () => calls.push('begin'), release: () => calls.push('release') }) });
  await assert.rejects(source.executeBatch('world', 'access_requirement', ['DELETE old']), /InnoDB/);
  assert.deepEqual(calls, ['release']);
});

test('a failed connection keeps the previous source and saved active profile', async (t) => {
  const service = serviceFor(t);
  const original = service.source;
  const close = t.mock.method(original, 'close', async () => {});
  t.mock.method(MySqlDataSource, 'connect', async () => { throw new Error('access denied'); });
  const profile = { id: 'test', name: 'Test', host: '127.0.0.1', port: 3306, user: 'trinity', password: 'not-a-real-secret', databases: { world: 'world' } };
  await assert.rejects(service.connect(profile), /access denied/);
  assert.equal(service.source, original);
  assert.equal(close.mock.callCount(), 0);
  assert.equal((await service.getSettings()).activeProfileId, null);
});

test('passwords are persisted only with explicit consent', async (t) => {
  const service = serviceFor(t);
  const profile = { id: 'test', name: 'Test', host: 'example.invalid', port: 3306, user: 'trinity', password: 'test-only-password', databases: { auth: '', characters: '', world: 'world', hotfixes: '' } };
  await service.saveSettings({ profiles: [profile] });
  const file = path.join(process.env.WYRMREST_HOME, 'settings.json');
  assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /test-only-password/);
  await service.saveSettings({ profiles: [{ ...profile, rememberPassword: true }] });
  assert.match(fs.readFileSync(file, 'utf8'), /test-only-password/);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});

test('serialized apply cannot drop an edit staged while execution is in flight', async (t) => {
  const service = serviceFor(t);
  await service.stage(update);
  let release;
  const wait = new Promise((resolve) => { release = resolve; });
  service.source = { mode: 'live', executeBatch: () => wait, close: async () => {} };
  const applying = service.applyToDatabase();
  const editing = service.stage({ ...update, values: { name: { before: 'Hogger edited', after: 'A newer edit' } } });
  release();
  assert.equal((await applying).applied, 1);
  await editing;
  assert.equal((await service.getLedger()).changes[0].values.name.after, 'A newer edit');
});

test('export paths cannot escape the version directory and comments stay comments', (t) => {
  const root = temp(t);
  for (const version of ['../escape', '../../..', '/tmp', '', '3.4.3/other', '3.4.3\\other']) {
    assert.throws(() => exportChanges([update], { root, version, author: '' }), /version folder/);
  }
  assert.equal(fs.readdirSync(root).length, 0);
  const { sql } = renderChanges('world', [{ ...update, note: 'First line\nDELETE FROM account;' }], '3.4.3', 'A\r\nDROP TABLE account;');
  assert.match(sql, /\n-- DELETE FROM account;/);
  assert.match(sql, /\n-- DROP TABLE account;/);
});

test('export sequences continue beyond 99 without overwriting and preflight all tables', (t) => {
  const root = temp(t);
  const when = new Date(2026, 8, 7);
  fs.writeFileSync(path.join(root, '2026_09_07_99_world.sql'), 'keep');
  fs.writeFileSync(path.join(root, '2026_09_07_100_world.sql'), 'keep');
  assert.equal(nextFileName(root, 'world', when), '2026_09_07_101_world.sql');
  assert.throws(() => exportChanges([{ ...update, database: 'auth', table: 'not_a_table' }, update], { root, version: '3.4.3', author: '' }), /unknown table/);
  assert.equal(fs.existsSync(path.join(root, 'sql')), false);
});

test('an apply that commits but cannot save its ledger progress is reported honestly', async (t) => {
  const service = serviceFor(t);
  await service.stage(update);
  service.source = { mode: 'live', executeBatch: async () => {}, close: async () => {} };
  t.mock.method(fs, 'renameSync', () => { throw new Error('disk unavailable'); });
  await assert.rejects(service.applyToDatabase(), /were applied to the server.*verify the server/);
  assert.equal((await service.getLedger()).changes.length, 1);
});

test('a failed multi-database export rolls back only its newly created files', (t) => {
  const root = temp(t);
  const write = fs.writeFileSync;
  let calls = 0;
  t.mock.method(fs, 'writeFileSync', (...args) => {
    if (++calls === 2) throw new Error('disk full');
    return write(...args);
  });
  assert.throws(() => exportChanges([
    { kind: 'delete', database: 'auth', table: 'account', key: { id: 1 }, values: {} }, update,
  ], { root, version: '3.4.3', author: '' }), /disk full/);
  for (const db of ['auth', 'world']) assert.deepEqual(fs.readdirSync(path.join(root, 'sql', 'updates', db, '3.4.3')), []);
});

test('indistinguishable keyless rows cannot be targeted by a staged update', async (t) => {
  const service = serviceFor(t);
  const meta = tableMeta('world', 'event_scripts');
  const row = defaultRow(meta);
  assert.equal(meta.identityColumns.length, 0);
  service.source = { mode: 'demo', query: async () => ({ rows: [row, row] }), close: async () => {} };
  await assert.rejects(service.stage({ kind: 'update', database: 'world', table: meta.name, key: row, values: { delay: { before: 0, after: 1 } } }), /Identical rows/);
  assert.equal((await service.getLedger()).changes.length, 0);
});

test('malformed settings are rejected before they can break the connection UI', async (t) => {
  const service = serviceFor(t);
  await assert.rejects(service.saveSettings({ profiles: [{ id: 'bad', name: null }] }), /must be text/);
  await assert.rejects(service.saveSettings({ mode: 'unknown' }), /Unknown connection mode/);
  assert.equal((await service.getSettings()).profiles[0].name, 'Local TrinityCore');
});

test('failed startup reconnects are visible while the usable demo stays available', async (t) => {
  const service = serviceFor(t);
  await service.saveSettings({ mode: 'live', activeProfileId: 'local' });
  t.mock.method(MySqlDataSource, 'connect', async () => { throw new Error('access denied'); });
  const status = await service.restore();
  assert.equal(status.mode, 'demo');
  assert.match(status.warning, /access denied.*sample data/);
  assert.equal((await service.query({ database: 'world', table: 'creature_template' })).rows[0].name, 'Hogger');
});
