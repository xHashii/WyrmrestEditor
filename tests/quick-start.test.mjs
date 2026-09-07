import test from 'node:test';
import assert from 'node:assert/strict';
import { addRecent, loadRecent, parseRecent, recentKey, recentSource, saveRecent } from '../src/renderer/recent.ts';
import { useStore } from '../src/renderer/store.ts';
import { api } from '../src/renderer/api.ts';
import { tableMeta } from '../src/core/metadata.ts';
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('resources/metadata/derived/smartai.json', 'utf8'));
const meta = tableMeta('world', 'smart_scripts');
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
const table = { source: 'demo', kind: 'table', database: 'world', table: 'creature_template', label: 'Creatures' };
const script = { source: 'demo', kind: 'script', entryorguid: '448', sourceType: 0, label: 'Hogger' };

test('recent shortcuts are deduplicated, bounded and keyed by script kind and connection', () => {
  const otherKind = { ...script, sourceType: 9 };
  const otherServer = { ...script, source: 'profile:other' };
  assert.notEqual(recentKey(script), recentKey(otherKind));
  assert.notEqual(recentKey(script), recentKey(otherServer));
  assert.deepEqual(addRecent([script, table], { ...script, label: 'Fresh name' }), [{ ...script, label: 'Fresh name' }, table]);
  assert.equal(addRecent(Array.from({ length: 60 }, (_, i) => ({ ...script, entryorguid: String(i + 1) })), script).length, 40);
  assert.equal(recentSource({ mode: 'live', profile: { id: 'other' } }), 'profile:other');
  assert.equal(recentSource({ mode: 'demo' }), 'demo');
});

test('bad history and blocked storage cannot prevent boot or corrupt script IDs', (t) => {
  assert.deepEqual(parseRecent('broken JSON'), []);
  assert.deepEqual(parseRecent('{}'), []);
  assert.deepEqual(parseRecent(JSON.stringify([null, {}, { ...script, entryorguid: 448 }, { ...script, sourceType: '0' }, { ...table, database: 'unknown' }, script, table])), [script, table]);
  const window = globalThis.window;
  globalThis.window = { get localStorage() { throw new Error('Storage denied'); } };
  t.after(() => { if (window === undefined) delete globalThis.window; else globalThis.window = window; });
  assert.deepEqual(loadRecent(), []);
  assert.equal(saveRecent([script]), false);
});

function setup(t) {
  useStore.setState({ ...useStore.getInitialState(), ready: true, smartData: data, status: { mode: 'demo', connected: true, profile: null, databases: {} } });
  t.mock.method(api, 'getTable', async (db, table) => tableMeta(db, table));
  t.mock.method(api, 'getSmartData', async () => data);
  t.mock.method(api, 'resolveNames', async () => ({ 448: 'Hogger' }));
  const query = t.mock.method(api, 'query', async (request) => ({ rows: [], total: 0, offset: 0, limit: request.limit, sql: 'SELECT', durationMs: 0 }));
  return query;
}

test('Quick Start opens the SmartAI loader without first querying an arbitrary table page', async (t) => {
  const query = setup(t);
  await useStore.getState().openSmartEditor();
  assert.equal(useStore.getState().workspaceView, 'editor');
  assert.equal(useStore.getState().meta.name, 'smart_scripts');
  assert.equal(useStore.getState().smart.view, 'script');
  assert.equal(useStore.getState().smart.entryorguid, null);
  assert.equal(query.mock.callCount(), 0);
  assert.equal(useStore.getState().ledger.length, 0);
});

test('direct loading retains signed IDs and uses the exact source_type and whole-script limit', async (t) => {
  const query = setup(t);
  await useStore.getState().openSmartEditor({ entryorguid: '-12345', sourceType: 0 });
  assert.deepEqual(query.mock.calls[0].arguments[0].filters, [{ column: 'entryorguid', op: '=', value: '-12345' }, { column: 'source_type', op: '=', value: 0 }]);
  assert.equal(query.mock.calls[0].arguments[0].limit, 500);
  assert.equal(useStore.getState().smart.entryorguid, '-12345');
  await useStore.getState().selectScript('448', 9);
  assert.equal(useStore.getState().smart.sourceType, 9);
  assert.equal(useStore.getState().recentItems[0].sourceType, 9);
  assert.equal(useStore.getState().ledger.length, 0);
});

test('invalid IDs and unsupported kinds cannot replace the current script', async (t) => {
  const query = setup(t);
  await useStore.getState().openSmartEditor({ entryorguid: '448', sourceType: 0 });
  for (const [id, kind] of [['abc', 0], ['0', 0], ['99999999999999999999999', 0], ['448', 255]]) {
    assert.equal(await useStore.getState().selectScript(id, kind), false);
    assert.equal(useStore.getState().smart.entryorguid, '448');
    assert.equal(useStore.getState().smart.sourceType, 0);
  }
  assert.equal(query.mock.callCount(), 1);
});

test('late SmartAI metadata cannot steal focus after returning to Quick Start or choosing a table', async (t) => {
  setup(t);
  const pending = deferred();
  t.mock.method(api, 'getTable', (db, name) => name === 'smart_scripts' ? pending.promise : Promise.resolve(tableMeta(db, name)));
  const loading = useStore.getState().openSmartEditor({ entryorguid: '448', sourceType: 0 });
  useStore.getState().showQuickStart();
  await useStore.getState().openTable('auth', 'account');
  pending.resolve(meta);
  await loading;
  assert.equal(useStore.getState().meta.name, 'account');
  assert.equal(useStore.getState().smart.view, 'grid');
  useStore.getState().showQuickStart();
  assert.equal(useStore.getState().workspaceView, 'quick-start');
});

test('a late script name cannot create a recent shortcut for the wrong script', async (t) => {
  setup(t);
  const pending = deferred();
  t.mock.method(api, 'resolveNames', () => pending.promise);
  await useStore.getState().openSmartEditor();
  const first = useStore.getState().selectScript('448', 0);
  await new Promise((resolve) => setImmediate(resolve));
  await useStore.getState().selectScript('448', 9); // timed list needs no name lookup
  pending.resolve({ 448: 'Old name' });
  await first;
  assert.equal(useStore.getState().smart.sourceType, 9);
  assert.equal(useStore.getState().recentItems.length, 1);
  assert.equal(useStore.getState().recentItems[0].sourceType, 9);
});

test('failed definition loading is recoverable and history clearing leaves the ledger alone', async (t) => {
  setup(t);
  useStore.setState({ smartData: null, recentItems: [script, { ...table, source: 'profile:other' }], ledger: [{ id: 'kept' }] });
  const definitions = t.mock.method(api, 'getSmartData', async () => { throw new Error('Definitions unavailable'); });
  await useStore.getState().openSmartEditor();
  assert.equal(useStore.getState().queryError, 'Definitions unavailable');
  assert.equal(useStore.getState().loading, false);
  definitions.mock.mockImplementation(async () => data);
  await useStore.getState().openSmartEditor();
  assert.equal(useStore.getState().queryError, null);
  assert.equal(useStore.getState().meta.name, 'smart_scripts');
  useStore.getState().clearRecentItems();
  assert.deepEqual(useStore.getState().recentItems, [{ ...table, source: 'profile:other' }]);
  assert.equal(useStore.getState().ledger[0].id, 'kept');
});
