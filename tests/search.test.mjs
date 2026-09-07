import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * The search mini-language: one parser, shared by the grid's SQL builder and by
 * the chips that explain what was understood. Quoting, negation and `entity:`
 * prefixes must behave identically in both.
 */
process.env.WYRMREST_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-search-'));
const { parseSearch, entityForPrefix } = await import('../src/shared/search.ts');

const COLUMNS = ['entry', 'name', 'subname', 'level', 'faction', 'gossip_menu_id', 'verifiedbuild'];
const ENTITIES = ['creature', 'quest', 'spell', 'faction', 'gossipMenu', 'map'];
const parse = (raw) => parseSearch(raw, COLUMNS, ENTITIES).tokens;
const kinds = (raw) => parse(raw).map((token) => `${token.not ? '-' : ''}${token.kind}:${token.value ?? token.column ?? ''}`);

test('plain words search text, numbers are offered to id columns as well', () => {
  assert.deepEqual(kinds('Hogger'), ['text:Hogger']);
  assert.deepEqual(kinds('448'), ['text:448']);
  assert.equal(parse('448')[0].numeric, undefined, 'the caller decides what a number means');
});

test('quoted phrases stay one term, and a space after an operator is optional', () => {
  assert.deepEqual(kinds('"Innkeeper Farley" gossip'), ['text:Innkeeper Farley', 'text:gossip']);
  assert.deepEqual(kinds('name: Farley'), ['column:Farley']);
  assert.equal(parse('name: Farley')[0].column, 'name');
});

test('entity prefixes are resolved case- and punctuation-insensitively', () => {
  assert.deepEqual(kinds('spell:Fireball'), ['entity:Fireball']);
  assert.equal(parse('Spell:FIREBALL')[0].entity, 'spell');
  assert.equal(parse('mob:Hogger')[0].entity, 'creature', 'aliases reach the same entity');
  assert.equal(parse('faction=14')[0].entity, 'faction');
});

test('a word that matches both a column and an alias is a column comparison', () => {
  // `entry` is a real column here; it must not be read as "creature:…".
  assert.deepEqual(kinds('entry:5'), ['column:5']);
  assert.equal(parse('entry:5')[0].column, 'entry');
  assert.deepEqual(kinds('quest:10'), ['entity:10'], 'an alias that is not a column still resolves');
});

test('operators survive the split', () => {
  const [level] = parse('level>20');
  assert.deepEqual([level.column, level.op, level.value], ['level', '>', '20']);
  const [name] = parse('name~keep');
  assert.deepEqual([name.column, name.op], ['name', 'like']);
  const [start] = parse('subname^Inn');
  assert.deepEqual([start.column, start.op, start.value], ['subname', 'startsWith', 'Inn']);
});

test('negation is carried on the token, not swallowed', () => {
  assert.deepEqual(kinds('-Hogger'), ['-text:Hogger']);
  assert.deepEqual(kinds('-spell:Fireball'), ['-entity:Fireball']);
  assert.equal(parse('-nope:x')[0].not, true);
});

test('unknown prefixes are reported instead of silently matching nothing', () => {
  const tokens = parse('account:root Hogger');
  assert.deepEqual(tokens.map((token) => token.kind), ['unknown', 'text']);
  assert.equal(tokens[0].key, 'account');
  assert.equal(entityForPrefix('account', ENTITIES), null, 'account is not offered by this table');
  assert.equal(entityForPrefix('spell', ENTITIES), 'spell');
});

test('unbalanced quotes and stray operators do not lose the term', () => {
  assert.deepEqual(kinds('"unbalanced'), ['text:unbalanced']);
  assert.deepEqual(kinds('name:~'), ['text:name:~'], 'an operator with no value is a word, not a clause');
  assert.deepEqual(kinds('name:'), ['text:name:'], 'a prefix with no value is just a word');
  assert.deepEqual(kinds('   '), []);
});
