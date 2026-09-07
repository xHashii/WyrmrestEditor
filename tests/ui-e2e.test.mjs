import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { JSDOM, VirtualConsole } from 'jsdom';

/**
 * End to end: the real renderer bundle, driven in jsdom against the real API
 * server, editing a cell and exporting the resulting sql/updates file.
 *
 * Requires `npm run build` first (dist/node + dist/renderer).
 */

const ROOT = process.cwd();
const RENDERER = path.join(ROOT, 'dist', 'renderer');
const SERVER = path.join(ROOT, 'dist', 'node', 'server', 'index.js');
const PORT = 8899;

const ready = fs.existsSync(path.join(RENDERER, 'index.html')) && fs.existsSync(SERVER);

async function boot(t, port) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-e2e-home-'));
  const exportRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-e2e-root-'));
  const PORT = port;

  const server = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      WYRMREST_HOME: home,
      WYRMREST_ROOT: ROOT,
      WYRMREST_EXPORT_ROOT: exportRoot,
    },
    stdio: 'ignore',
  });
  t.after(() => server.kill());

  const base = `http://127.0.0.1:${PORT}`;
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) break;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  await fetch(`${base}/api/settings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ exportRoot, version: '3.4.3', author: 'e2e' }),
  });

  // ---- boot the real bundle -------------------------------------------------
  const html = fs.readFileSync(path.join(RENDERER, 'index.html'), 'utf8');
  const bundle = fs
    .readdirSync(path.join(RENDERER, 'assets'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => fs.readFileSync(path.join(RENDERER, 'assets', f), 'utf8'))
    .join('\n');

  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => errors.push(String(e.stack ?? e.message)));
  virtualConsole.on('error', (...args) => errors.push(args.map(String).join(' ')));

  const dom = new JSDOM(html.replace(/<script[^>]*><\/script>/g, ''), {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  t.after(() => window.close());

  window.fetch = async (url, init) => {
    const res = await fetch(base + (String(url).startsWith('/') ? url : `/${url}`), init);
    const text = await res.text();
    return { ok: res.ok, status: res.status, json: async () => JSON.parse(text), text: async () => text };
  };
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  // jsdom has no layout; the row virtualiser needs a measurable viewport.
  for (const prop of ['offsetHeight', 'clientHeight']) {
    Object.defineProperty(window.HTMLElement.prototype, prop, { configurable: true, get: () => 900 });
  }
  for (const prop of ['offsetWidth', 'clientWidth']) {
    Object.defineProperty(window.HTMLElement.prototype, prop, { configurable: true, get: () => 1400 });
  }
  window.Element.prototype.getBoundingClientRect = () => ({
    width: 1400,
    height: 900,
    top: 0,
    left: 0,
    right: 1400,
    bottom: 900,
    x: 0,
    y: 0,
    toJSON() {},
  });

  window.eval(bundle);
  const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));
  await settle(2500);
  assert.ok(window.document.querySelector('.quick-start'), 'Quick Start is the launch screen');
  window.document.querySelector('[data-quick-table="creature_template"]').click();
  await settle(700);
  return { window, doc: window.document, settle, base, exportRoot, errors };
}

test('edit → stage → export, through the shipped UI', { skip: ready ? false : 'run `npm run build` first' }, async (t) => {
  const { window, doc, settle, base, exportRoot, errors } = await boot(t, PORT);
  assert.ok(doc.querySelectorAll('.table-item').length > 100, 'sidebar lists tables');
  const headers = [...doc.querySelectorAll('.grid-head-cell .head-label')].map((n) => n.textContent);
  assert.ok(headers.includes('entry'), 'creature_template columns are rendered');
  const firstRow = doc.querySelector('.grid-row');
  assert.ok(firstRow, 'a data row is rendered');

  // ---- edit the `name` cell -------------------------------------------------
  const nameIndex = headers.indexOf('name');
  const cells = firstRow.querySelectorAll('.grid-cell');
  const nameCell = cells[nameIndex + 1]; // +1 for the gutter column
  assert.equal(nameCell.textContent.trim(), 'Hogger');

  nameCell.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
  await settle(200);
  const input = doc.querySelector('.cell-input');
  assert.ok(input, 'inline editor opened');

  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'Hogger the Terrible');
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await settle(600);

  // ---- the ledger holds the change ------------------------------------------
  const ledger = await (await fetch(`${base}/api/ledger`)).json();
  assert.equal(ledger.data.changes.length, 1, 'exactly one staged change');
  const change = ledger.data.changes[0];
  assert.equal(change.kind, 'update');
  assert.equal(change.table, 'creature_template');
  assert.deepEqual(change.key, { entry: 448 });
  assert.deepEqual(change.values.name, { before: 'Hogger', after: 'Hogger the Terrible' });

  // the grid shows the staged value, marked dirty
  assert.match(doc.querySelector('.grid-row').textContent, /Hogger the Terrible/);
  assert.ok(doc.querySelector('.cell-dirty'), 'the edited cell is marked as staged');
  assert.match(doc.querySelector('.chip-staged')?.textContent ?? '', /Staged changes/);

  // ---- export ---------------------------------------------------------------
  const exported = await (
    await fetch(`${base}/api/ledger/export`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ version: '3.4.3', author: 'e2e', clearAfterExport: true }),
    })
  ).json();
  assert.ok(exported.ok, exported.error);
  const file = exported.data.files[0];
  assert.match(file.relativePath, /^sql\/updates\/world\/3\.4\.3\/\d{4}_\d{2}_\d{2}_00_world\.sql$/);
  const written = fs.readFileSync(path.join(exportRoot, file.relativePath), 'utf8');
  assert.match(written, /UPDATE `creature_template` SET `name`='Hogger the Terrible' WHERE `entry`=448;/);

  const afterExport = await (await fetch(`${base}/api/ledger`)).json();
  assert.equal(afterExport.data.changes.length, 0, 'ledger cleared after export');

  assert.deepEqual(errors, [], 'no runtime errors in the renderer');
});

test('flag editor, ID picker and table palette', { skip: ready ? false : 'run `npm run build` first' }, async (t) => {
  const { window, doc, settle, base, errors } = await boot(t, PORT + 1);
  const headers = [...doc.querySelectorAll('.grid-head-cell .head-label')].map((n) => n.textContent);
  const cellFor = (rowIndex, column) =>
    doc.querySelectorAll('.grid-row')[rowIndex].querySelectorAll('.grid-cell')[headers.indexOf(column) + 1];
  const dblclick = (el) => el.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
  const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  // ---- bitmask editor -------------------------------------------------------
  // Innkeeper Farley (row 2) has npcflag = Gossip | Innkeeper | Vendor.
  const npcflagCell = cellFor(2, 'npcflag');
  assert.match(npcflagCell.textContent, /Gossip/, 'flags render as documented names');
  dblclick(npcflagCell);
  await settle(200);

  const popover = doc.querySelector('.flags-popover');
  assert.ok(popover, 'the bitmask editor opened');
  const flagRows = [...popover.querySelectorAll('.flag-row')];
  assert.ok(flagRows.length > 20, 'documented npc flags are listed');
  // npcflag 65539 = Gossip | Quest Giver | Innkeeper: clear one bit, set another.
  const byFlagName = (name) => flagRows.find((r) => r.querySelector('.flag-name')?.textContent === name);
  const questGiver = byFlagName('Quest Giver');
  const vendor = byFlagName('Vendor');
  assert.ok(questGiver.classList.contains('on'), 'set bits are shown as checked');
  assert.ok(!vendor.classList.contains('on'), 'unset bits are shown as unchecked');
  click(questGiver.querySelector('input'));
  click(vendor.querySelector('input'));
  await settle(120);
  click([...popover.querySelectorAll('button')].find((b) => b.textContent.includes('Stage value')));
  await settle(500);

  let ledger = (await (await fetch(`${base}/api/ledger`)).json()).data.changes;
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].values.npcflag.after, (65539 & ~2) | 128, 'Quest Giver cleared, Vendor set');
  assert.match(cellFor(2, 'npcflag').textContent, /Vendor/, 'the grid reflects the staged bitmask');

  // ---- ID picker ------------------------------------------------------------
  const factionCell = cellFor(0, 'faction');
  assert.match(factionCell.textContent, /14/, 'reference cells show the raw id');
  dblclick(factionCell);
  await settle(700);
  const picker = doc.querySelector('.picker-popover');
  assert.ok(picker, 'the ID picker opened');
  assert.match(picker.textContent, /hotfixes\.faction\.ID/, 'the picker names its target');
  const items = [...picker.querySelectorAll('.picker-item')];
  assert.ok(items.length > 3, 'the picker lists candidates');
  const stormwind = items.find((i) => i.textContent.includes('Stormwind'));
  assert.ok(stormwind, 'faction names are searchable');
  click(stormwind);
  await settle(500);

  ledger = (await (await fetch(`${base}/api/ledger`)).json()).data.changes;
  const factionChange = ledger.find((c) => c.values.faction);
  assert.equal(factionChange.values.faction.after, 12, 'picking Stormwind staged faction 12');

  // ---- keyboard navigation --------------------------------------------------
  const grid = doc.querySelector('.grid');
  const press = (key, init = {}) =>
    grid.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, ...init }));
  // Identity and the name now lead the grid; start on a neighboring text
  // field so ArrowRight still targets an inline (rather than reference) editor.
  click(cellFor(0, 'femaleName'));
  await settle(120);
  press('ArrowDown');
  press('ArrowRight');
  await settle(150);
  const selectedCell = doc.querySelector('.grid-cell.cell-selected');
  assert.ok(selectedCell, 'a cell is selected after arrow navigation');
  press('Enter');
  await settle(150);
  assert.ok(doc.querySelector('.cell-input'), 'Enter opens the inline editor');
  press('Escape');
  grid.querySelector('.cell-input')?.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
  await settle(150);

  // ---- command palette ------------------------------------------------------
  window.document.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
  );
  await settle(200);
  const paletteInput = doc.querySelector('.palette input');
  assert.ok(paletteInput, 'Ctrl+K opens the palette');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(paletteInput, 'smart_scripts');
  paletteInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await settle(200);
  const first = doc.querySelector('.palette-item');
  assert.match(first.textContent, /smart_scripts/);
  click(first);
  await settle(1200);

  assert.match(doc.querySelector('.table-title').textContent, /smart_scripts/, 'the palette switched tables');
  const smartHeaders = [...doc.querySelectorAll('.grid-head-cell .head-label')].map((n) => n.textContent);
  assert.ok(smartHeaders.includes('action_type'));
  const smartRow = doc.querySelectorAll('.grid-row')[0];
  // Guards against the stale-rows race: the row must belong to smart_scripts,
  // not to whatever table was open before.
  assert.match(smartRow.textContent, /Hogger - On Aggro/, 'rows belong to the newly opened table');
  const actionCell = smartRow.querySelectorAll('.grid-cell')[smartHeaders.indexOf('action_type') + 1];
  assert.match(actionCell.textContent, /SMART_ACTION_/, 'SmartAI actions render with their constant names');

  assert.deepEqual(errors, [], 'no runtime errors in the renderer');
});
