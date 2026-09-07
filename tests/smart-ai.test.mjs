import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * The SmartAI model layer: the definitions the app offers must match the core it
 * edits, and a script must survive being reordered, linked and described.
 * Everything here is pure — the same code the renderer runs.
 */
process.env.WYRMREST_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-smart-'));
const smart = await import('../src/shared/smart.ts');
const { tableMeta } = await import('../src/core/metadata.ts');
const valueText = (value) => (value === null || value === undefined ? '0' : String(value));
const { DemoDataSource, buildWhere, planSearch, searchClause, searchContext } = await import('../src/core/datasource.ts');

const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'resources', 'metadata', 'derived', 'smartai.json'), 'utf8'));
const meta = tableMeta('world', 'smart_scripts');
const columns = Object.fromEntries(meta.columns.map((column) => [column.name, column.default ?? 0]));

/** A row of the demo script, with only the interesting columns spelled out. */
const rowValues = (values) => ({ ...columns, Difficulties: '', ...values });
const toRows = (rows) => smart.toSmartRows(rows.map((row, index) => ({
  key: `db:${index}`,
  row: rowValues(row),
  change: null,
  origin: 'db',
})), data);

/** A SmartSource for a definition id, with the values the test cares about. */
const source = (key, id, values = {}) => {
  const def = smart.definitionsFor(data, key).find((item) => item.id === id) ?? null;
  const params = (def?.params ?? []).filter((param) => param.column in values);
  return {
    key, typeColumn: `${key}_type`, def, id, constant: def?.name ?? 'X', label: def?.label ?? 'Unknown',
    params, values: Object.fromEntries(params.map((param) => [param.column, values[param.column]])), rowKey: '', column: `${key}_type`,
  };
};

test('the derived definitions describe this core, not some other branch', () => {
  assert.ok(data.events.length > 60, 'events should be the 3.3.5/master union');
  assert.ok(data.actions.some((def) => def.name === 'SMART_ACTION_TALK'));
  assert.ok(data.actions.every((def) => def.params.every((param) => meta.columns.some((column) => column.name === param.column))),
    'no parameter may point at a column smart_scripts does not have');
  assert.ok(data.sourceTypes.some((kind) => kind.value === 0 && kind.entity === 'creature'));
  // Definitions newer than 3.4.3 stay visible but are marked, so the editor can warn.
  assert.ok(data.actions.some((def) => def.supported === false));
  for (const def of data.actions.filter((item) => item.supported === false)) {
    assert.ok(def.id > 0, `${def.name} must still carry its id`);
  }
});

test('wiki markup and template syntax never reach the UI', () => {
  assert.equal(smart.unwrapTemplateMarkup('Cast spell [spell={pram1value}] {pram1} on target'), 'Cast spell {pram1value} on target');
  assert.equal(smart.unwrapTemplateMarkup('line[p]break[/p]'), 'line break');
  assert.equal(smart.unwrapTemplateMarkup('[p=0]x'), 'x');
  const action = source('action', 11, { action_param1: 133, action_param2: 0 });
  const context = { value: (column) => (column === 'action_param1' ? 133 : 0), name: () => 'Fireball', targetLabel: 'Victim' };
  const rendered = smart.renderTemplate('{source}: Cast spell [spell={pram1value}] {pram2value:choose(0):| with flags {pram2}} on {target}', context, { action });
  assert.doesNotMatch(rendered, /[[\]{}]/, `template residue in “${rendered}”`);
  assert.match(rendered, /Cast spell 133 on/);
});

test('descriptions resolve parameters to names and keep choose branches readable', () => {
  const values = { action_param1: 133, action_param2: 0, action_param3: 0, action_param4: 0 };
  const action = source('action', 11, values); // SMART_ACTION_CAST
  const event = source('event', 4);
  const segments = smart.describeSmartSource(action, event, {
    value: (column) => values[column] ?? 0,
    name: (entity, value) => (entity === 'spell' && Number(value) === 133 ? 'Fireball' : null),
    labelFor: (_def, param, value) => (param?.entity === 'spell' ? 'Fireball' : valueText(value)),
    sourceLabel: 'Hogger',
    sourceId: 448,
    targetLabel: 'Current victim',
  }, 'action');
  const text = segments.map((segment) => segment.text).join('');
  assert.match(text, /Fireball/);
  assert.match(text, /Hogger/);
  assert.doesNotMatch(text, /pram|\[spell|NULL/, `raw template leaked: ${text}`);
  assert.ok(segments.some((segment) => segment.type === 'param' && segment.column === 'action_param1'), 'the spell must stay clickable');
});

test('a script groups chained actions under their event and keeps loose rows', () => {
  const rows = toRows([
    { entryorguid: 448, source_type: 0, id: 0, link: 1, event_type: 4, action_type: 1, action_param1: 1 },
    { entryorguid: 448, source_type: 0, id: 1, link: 0, event_type: 0, action_type: 5 },
    { entryorguid: 448, source_type: 0, id: 2, link: 0, comment: 'flavour text' },
    { entryorguid: 448, source_type: 0, id: 3, link: 0, event_type: 11, event_param1: 3000, action_type: 11, action_param1: 133 },
  ]);
  assert.ok(rows[2].isComment, 'a row with no event and no action is a comment row');
  assert.ok(rows[1].isActionOnly, 'an action with no event is a chained row');

  const script = smart.buildScript(rows);
  assert.equal(script.entries.length, 3, 'the chained rows must fold into their event');
  const head = script.entries[0];
  assert.equal(head.head.id, 0);
  assert.deepEqual(head.actions.map((row) => row.id), [1], 'the comment row is its own entry, not an action');
  assert.equal(script.entries[1].kind, 'comment');
  assert.equal(script.entries[2].kind, 'event');

  const broken = smart.buildScript(toRows([{ entryorguid: 1, source_type: 0, id: 0, link: 7, event_type: 4 }]));
  assert.equal(broken.entries[0].brokenLink, 7, 'a link to a missing row must be reported, not swallowed');
});

test('reordering renumbers ids and relinks chains in the same pass', () => {
  const rows = toRows([
    { entryorguid: 9, source_type: 0, id: 0, link: 1, event_type: 4, action_type: 1 },
    { entryorguid: 9, source_type: 0, id: 1, link: 0, event_type: 0, action_type: 5 },
    { entryorguid: 9, source_type: 0, id: 2, link: 0, event_type: 11, action_type: 11 },
  ]);
  const script = smart.buildScript(rows);
  const groups = smart.entryIdGroups(script);
  assert.deepEqual(groups, [[0, 1], [2]]);

  const patches = smart.reorderScript(rows, [groups[1], groups[0]]);
  const byRow = Object.fromEntries(patches.map((patch) => [patch.rowKey, patch.values]));
  // The moved entry becomes rows 0/1, the pushed-down entry row 2, and the link
  // inside the entry still points at its own action.
  assert.deepEqual(byRow['db:2'], { id: 0 });
  assert.deepEqual(byRow['db:0'], { id: 1, link: 2 });
  assert.deepEqual(byRow['db:1'], { id: 2 });
  const applied = rows.map((row) => ({ ...row, ...byRow[row.rowKey] }));
  assert.deepEqual(applied.map((row) => row.id), [1, 2, 0], 'every row keeps one id');
});

test('linking and unlinking only touches the tail of the chain', () => {
  const rows = toRows([
    { entryorguid: 5, source_type: 0, id: 0, link: 1, event_type: 4 },
    { entryorguid: 5, source_type: 0, id: 1, link: 0, action_type: 1 },
  ]);
  const script = smart.buildScript(rows);
  assert.deepEqual(smart.linkPatchFor(script.entries[0], 2), { rowKey: 'db:1', values: { link: 2 } });
  assert.deepEqual(smart.unlinkPatchFor(rows, 1, 0), [{ rowKey: 'db:0', values: { link: 0 } }]);
  assert.equal(smart.nextScriptId(rows), 2);
});

test('validation reports the mistakes that break a live script', () => {
  const rows = toRows([
    { entryorguid: 3, source_type: 0, id: 0, link: 9, event_type: 4, action_type: 1, event_chance: 140 },
    { entryorguid: 3, source_type: 0, id: 0, link: 0, event_type: 4, action_type: 999999 },
  ]);
  const issues = smart.validateScript(smart.buildScript(rows), data);
  const messages = issues.map((issue) => issue.message).join('\n');
  assert.match(messages, /share id 0/);
  assert.match(messages, /links to id 9/);
  assert.match(messages, /event_chance must be 0–100/);
  assert.match(messages, /Unknown action_type 999999/);
  assert.ok(issues.every((issue) => issue.rowKey), 'every issue must point at a row so the UI can jump to it');
});

test('comments follow the TrinityCore convention', () => {
  const [row] = toRows([{ entryorguid: 448, source_type: 0, id: 0, link: 0, event_type: 4, action_type: 1, action_param1: 1, target_type: 1 }]);
  const comment = smart.suggestComment({
    subject: 'Hogger',
    event: row.event,
    action: row.action,
    target: row.target,
    value: (column) => row.values[column] ?? null,
    name: () => null,
  });
  assert.match(comment, /^Hogger - On aggro/);
  assert.match(comment, /Talk/);
  assert.doesNotMatch(comment, /undefined|NaN|--/);
});

test('the demo script and its staged edits stay consistent through the store path', async () => {
  const demo = new DemoDataSource();
  const scripts = await demo.smartScripts({ search: 'Hogger', limit: 10 });
  assert.ok(scripts.some((script) => String(script.entryorguid) === '448' && script.rows >= 2));
  const query = await demo.query({ database: 'world', table: 'smart_scripts', search: 'spell:Fireball', searchScope: 'references', limit: 100 });
  assert.equal(query.rows.length, 1, 'a spell name must find the row that only stores its id');
  assert.equal(query.rows[0].action_param1, 133);
  assert.ok(query.searchReferences?.some((hit) => hit.entity === 'spell' && hit.matches > 0), 'the resolution must be explained to the user');
});

test('search plans never look up a number by name and never invent a column', () => {
  const context = searchContext(meta);
  const byName = planSearch(context, { search: 'spell:Fireball' }, ['spell', 'creature']);
  assert.deepEqual(byName.lookups, [{ entity: 'spell', terms: ['Fireball'] }]);
  const numeric = planSearch(context, { search: 'spell:133' }, ['spell']);
  assert.deepEqual(numeric.lookups, [], 'an id is already an id');
  assert.equal(numeric.tokens[0].value, '133');
  const scoped = planSearch(context, { search: 'Fireball', searchScope: 'ids' }, ['spell']);
  const clause = searchClause(context, scoped, {});
  assert.match(clause.sql, /1=0|entryorguid/, 'ids scope must not fall back to LIKE on text');
  assert.doesNotMatch(clause.sql, /LIKE/, 'ids scope must not search text');

  const foreign = planSearch(context, { search: 'account:root' }, ['account']);
  const foreignClause = searchClause(context, foreign, {});
  assert.equal(foreignClause.sql, '1=0', 'a reference this table cannot hold must match nothing, not everything');
  assert.match(foreignClause.notes.join(' '), /no account reference/);
});

test('buildWhere keeps working for callers that pass a partial request', () => {
  const built = buildWhere(meta, { filters: [{ column: 'entryorguid', op: '=', value: 448 }] });
  assert.match(built.where, /WHERE `entryorguid` = \?/);
  assert.deepEqual(built.params, [448]);
});
