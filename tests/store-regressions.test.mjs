import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.WYRMREST_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-store-'));
const { useStore, gridRows, displayValue, rowKeyFor } = await import('../src/renderer/store.ts');
const { api } = await import('../src/renderer/api.ts');
const { WyrmrestService } = await import('../src/core/service.ts');
const { tableMeta } = await import('../src/core/metadata.ts');
const creature = tableMeta('world', 'creature_template');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

async function setup(t, database = 'world', table = 'creature_template') {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-store-case-'));
  process.env.WYRMREST_HOME = home;
  const service = new WyrmrestService();
  t.after(async () => { await service.shutdown(); fs.rmSync(home, { recursive: true, force: true }); });
  for (const method of ['query', 'stage', 'getTable', 'getSettings', 'saveSettings', 'getLedger', 'revert', 'clearLedger', 'resolveNames']) {
    t.mock.method(api, method, (...args) => service[method](...args));
  }
  useStore.setState({ ...useStore.getInitialState(), ready: true, database, tableName: table, meta: tableMeta(database, table),
    result: await service.query({ database, table }), settings: await service.getSettings() });
  return service;
}

function firstRow() { return gridRows(useStore.getState())[0]; }

test('editing a value back to its original actually removes the staged delta', async (t) => {
  await setup(t);
  const row = firstRow();
  await useStore.getState().stageEdit(row.key, 'name', 'Different');
  assert.equal(displayValue(firstRow(), 'name'), 'Different');
  await useStore.getState().stageEdit(row.key, 'name', 'Hogger');
  assert.equal(useStore.getState().ledger.length, 0);
  assert.equal(displayValue(firstRow(), 'name'), 'Hogger');
});

test('nullable text can become empty and return to NULL without a phantom change', async (t) => {
  await setup(t);
  const row = firstRow();
  assert.equal(row.row.femaleName, null);
  await useStore.getState().stageEdit(row.key, 'femaleName', '');
  assert.equal(displayValue(firstRow(), 'femaleName'), '');
  assert.equal(useStore.getState().ledger[0].values.femaleName.before, null);
  await useStore.getState().stageEdit(row.key, 'femaleName', null);
  assert.equal(useStore.getState().ledger.length, 0);
});

test('filter by an empty string uses equality rather than IS NULL', async (t) => {
  await setup(t);
  const row = firstRow();
  assert.equal(row.row.subname, '');
  await useStore.getState().filterByCell(row.key, 'subname');
  assert.deepEqual(useStore.getState().filters, [{ column: 'subname', op: '=', value: '' }]);
  await useStore.getState().refresh();
  assert.ok(useStore.getState().result.rows.length > 0);
});

test('invalid integer edits stay unstaged with a visible error', async (t) => {
  await setup(t);
  const row = firstRow();
  const selected = { rowKey: row.key, column: 'BaseAttackTime' };
  useStore.getState().beginEdit(selected);
  assert.equal(await useStore.getState().stageEdit(row.key, 'BaseAttackTime', '12oops'), false);
  assert.equal(useStore.getState().ledger.length, 0);
  assert.deepEqual(useStore.getState().editing, selected);
  assert.match(useStore.getState().editError, /whole number/);
  assert.equal(useStore.getState().toast.kind, 'error');
});

test('Refresh during metadata loading cannot cancel table opening', async (t) => {
  await setup(t);
  const pending = deferred();
  t.mock.method(api, 'getTable', () => pending.promise);
  const opening = useStore.getState().openTable('world', 'creature_template');
  await useStore.getState().refresh();
  pending.resolve(creature);
  await opening;
  assert.equal(useStore.getState().meta.name, 'creature_template');
  assert.equal(useStore.getState().result.rows[0].name, 'Hogger');
  assert.equal(useStore.getState().loading, false);
});

test('a late metadata failure cannot erase a newer table', async (t) => {
  await setup(t);
  const older = deferred();
  t.mock.method(api, 'getTable', (_database, table) => table === 'creature_template' ? older.promise : Promise.resolve(tableMeta('world', table)));
  const first = useStore.getState().openTable('world', 'creature_template');
  await useStore.getState().openTable('world', 'smart_scripts');
  older.reject(new Error('outdated failure'));
  await first;
  assert.equal(useStore.getState().meta.name, 'smart_scripts');
  assert.equal(useStore.getState().queryError, null);
  assert.ok(useStore.getState().result.rows[0].comment.includes('Hogger'));
});

test('database switching clears the previous table before a query or edit can use it', async (t) => {
  await setup(t);
  const pending = deferred();
  t.mock.method(api, 'getTable', () => pending.promise);
  useStore.getState().setDatabase('auth');
  assert.equal(useStore.getState().database, 'auth');
  assert.equal(useStore.getState().tableName, 'account');
  assert.equal(useStore.getState().meta, null);
  assert.equal(useStore.getState().result, null);
  assert.deepEqual(gridRows(useStore.getState()), []);
  pending.resolve(tableMeta('auth', 'account'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(useStore.getState().meta.database, 'auth');
});

test('search invalidates old results immediately, before the debounce fires', async (t) => {
  await setup(t);
  const pending = deferred();
  const original = useStore.getState().result;
  t.mock.method(api, 'query', () => pending.promise);
  const first = useStore.getState().refresh();
  useStore.getState().setSearch('new search');
  pending.resolve({ ...original, rows: [{ entry: 448, name: 'Stale response' }] });
  await first;
  assert.equal(useStore.getState().result.rows[0].name, 'Hogger');
  // Clear the scheduled refresh in this isolated store test.
  await useStore.getState().refresh();
});

test('editing a staged insert key keeps its UI selection and one SQL change', async (t) => {
  await setup(t);
  await useStore.getState().addRow();
  const first = firstRow();
  assert.equal(first.origin, 'staged-insert');
  const selected = useStore.getState().selected;
  await useStore.getState().stageEdit(first.key, 'entry', 999999);
  await useStore.getState().stageEdit(first.key, 'name', 'The new creature');
  assert.equal(firstRow().key, first.key);
  assert.equal(useStore.getState().selected.rowKey, selected.rowKey);
  assert.equal(useStore.getState().ledger.length, 1);
  assert.deepEqual(useStore.getState().ledger[0].key, { entry: 999999 });
  assert.equal(displayValue(firstRow(), 'name'), 'The new creature');
  await useStore.getState().deleteRow(first.key);
  assert.equal(useStore.getState().ledger.length, 0);
  assert.equal(gridRows(useStore.getState()).length, 15);
});

test('auto-generated inserts have different visible rows and deleting one keeps the other', async (t) => {
  await setup(t, 'auth', 'account');
  await useStore.getState().addRow();
  await useStore.getState().addRow();
  const inserts = gridRows(useStore.getState()).filter((r) => r.origin === 'staged-insert');
  assert.equal(inserts.length, 2);
  assert.notEqual(inserts[0].key, inserts[1].key);
  await useStore.getState().deleteRow(inserts[0].key);
  assert.equal(useStore.getState().ledger.length, 1);
  assert.equal(firstRow().key, inserts[1].key);
});

test('duplicate rows reserve a proposed key from the whole source, not the visible page', async (t) => {
  const service = await setup(t);
  t.mock.method(api, 'query', async (request) => request.orderBy?.[0]?.direction === 'desc'
    ? { ...useStore.getState().result, rows: [{ entry: 800000 }] } : service.query(request));
  await useStore.getState().duplicateRow(firstRow().key);
  assert.equal(useStore.getState().ledger[0].snapshot.entry, 800001);
  assert.equal(useStore.getState().ledger[0].snapshot.name, 'Hogger');
});

test('late name resolutions from a different connection are discarded', async (t) => {
  await setup(t);
  const pending = deferred();
  t.mock.method(api, 'resolveNames', () => pending.promise);
  useStore.setState({ meta: { ...creature, columns: [creature.columns.find((c) => c.name === 'faction')] }, names: {} });
  const resolving = useStore.getState().resolvePageNames();
  useStore.setState({ sourceToken: 100, names: { faction: { 14: 'New server faction' } } });
  pending.resolve({ 14: 'Old server faction' });
  await resolving;
  assert.equal(useStore.getState().names.faction['14'], 'New server faction');
});

test('unavailable ledger actions surface errors instead of unhandled rejections', async (t) => {
  await setup(t);
  t.mock.method(api, 'revert', async () => { throw new Error('editor service offline'); });
  await useStore.getState().revert(['some-change']);
  assert.equal(useStore.getState().toast.kind, 'error');
  assert.match(useStore.getState().toast.message, /offline/);
  assert.equal(useStore.getState().pendingMutations, 0);
});

test('composite row identity is independent of key object order', async (t) => {
  await setup(t, 'world', 'creature_queststarter');
  const meta = useStore.getState().meta;
  const row = { id: 448, quest: 176 };
  useStore.setState({ result: { ...useStore.getState().result, rows: [row] }, ledger: [{ id: 'change', database: 'world', table: meta.name, kind: 'update', key: { quest: 176, id: 448 }, values: { VerifiedBuild: { before: 0, after: 1 } } }] });
  assert.equal(firstRow().key, rowKeyFor(meta, row));
  assert.equal(firstRow().change.id, 'change');
});

test('identical keyless rows have distinct UI identities and are read-only', async (t) => {
  await setup(t, 'world', 'event_scripts');
  const row = Object.fromEntries(useStore.getState().meta.columns.map((c) => [c.name, 0]));
  useStore.setState({ result: { ...useStore.getState().result, rows: [row, { ...row }] } });
  const rows = gridRows(useStore.getState());
  assert.notEqual(rows[0].key, rows[1].key);
  assert.ok(rows.every((r) => r.ambiguous));
  assert.equal(await useStore.getState().stageEdit(rows[0].key, 'delay', 10), false);
  assert.equal(useStore.getState().ledger.length, 0);
});
