import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = process.cwd();
const RENDERER = path.join(ROOT, 'dist', 'renderer');
const SERVER = path.join(ROOT, 'dist', 'node', 'server', 'index.js');

async function boot(t, port) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-repro-home-'));
  const exportRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wyrmrest-repro-root-'));

  const server = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      WYRMREST_HOME: home,
      WYRMREST_ROOT: ROOT,
      WYRMREST_EXPORT_ROOT: exportRoot,
    },
    stdio: 'ignore',
  });
  t.after(() => server.kill());

  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) break;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 100));
  }

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
  for (const prop of ['offsetHeight', 'clientHeight']) {
    Object.defineProperty(window.HTMLElement.prototype, prop, { configurable: true, get: () => 900 });
  }
  for (const prop of ['offsetWidth', 'clientWidth']) {
    Object.defineProperty(window.HTMLElement.prototype, prop, { configurable: true, get: () => 1400 });
  }
  window.Element.prototype.getBoundingClientRect = () => ({
    width: 1400, height: 900, top: 0, left: 0, right: 1400, bottom: 900, x: 0, y: 0, toJSON() {},
  });

  window.eval(bundle);
  const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));
  await settle(2500);
  assert.ok(window.document.querySelector('.quick-start'), 'Quick Start is the launch screen');
  window.document.querySelector('[data-quick-table="creature_template"]').click();
  await settle(700);
  return { window, doc: window.document, settle, base, exportRoot, errors };
}

test('connection dialog opens with profiles, presets and test button', async (t) => {
  const { window, doc, settle, errors } = await boot(t, 8901);
  assert.deepEqual(errors, [], 'no boot errors');

  const chips = [...doc.querySelectorAll('.chip')];
  const connChip = chips.find((c) => /demo data|connected/.test(c.textContent));
  assert.ok(connChip, 'connection chip exists');
  connChip.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await settle(200);

  const modal = doc.querySelector('.modal-backdrop');
  assert.ok(modal, 'connection dialog opens');
  assert.match(modal.textContent, /Database connection/);

  // quick presets
  const presetLabels = [...modal.querySelectorAll('.btn-preset')].map((b) => b.textContent.trim());
  assert.ok(presetLabels.includes('Local TrinityCore'), 'local preset present');
  assert.ok(presetLabels.includes('AzerothCore'), 'azerothcore preset present');

  // saved-server list + action buttons
  assert.ok(modal.querySelector('.conn-profiles'), 'saved profiles list present');
  assert.ok([...modal.querySelectorAll('button')].some((b) => /test connection/i.test(b.textContent)), 'Test connection button present');
  assert.ok([...modal.querySelectorAll('button')].some((b) => /^connect$/i.test(b.textContent.trim())), 'Connect button present');

  // applying a preset changes the form
  const hostInput = [...modal.querySelectorAll('input')].find((i) => i.value === '127.0.0.1');
  assert.ok(hostInput, 'host field present');
  const acBtn = [...modal.querySelectorAll('.btn-preset')].find((b) => /AzerothCore/.test(b.textContent));
  acBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await settle(100);
  const schemaInputs = [...modal.querySelectorAll('input')].map((i) => i.value);
  assert.ok(schemaInputs.includes('acore_auth'), 'AzerothCore preset filled the auth schema');

  assert.deepEqual(errors, [], 'no runtime errors after dialog interactions');
});

test('quick action bar: filter-by-cell, duplicate and delete row', async (t) => {
  const { window, doc, settle, base, errors } = await boot(t, 8902);
  const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const dblclick = (el) => el.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));

  // quick bar renders
  const quickBar = doc.querySelector('.quick-bar');
  assert.ok(quickBar, 'quick action bar present');
  const quickButtons = [...quickBar.querySelectorAll('.btn-quick')].map((b) => b.textContent.trim());
  assert.ok(quickButtons.some((b) => /duplicate row/i.test(b)), 'duplicate button present');
  assert.ok(quickButtons.some((b) => /delete row/i.test(b)), 'delete button present');
  assert.ok(quickButtons.some((b) => /filter by cell/i.test(b)), 'filter-by-cell button present');

  // ---- filter by cell -------------------------------------------------------
  const headers = [...doc.querySelectorAll('.grid-head-cell .head-label')].map((n) => n.textContent);
  const nameIdx = headers.indexOf('name');
  const firstRow = doc.querySelector('.grid-row');
  const nameCell = firstRow.querySelectorAll('.grid-cell')[nameIdx + 1];
  click(nameCell); // select
  await settle(120);

  const filterBtn = [...quickBar.querySelectorAll('.btn-quick')].find((b) => /filter by cell/i.test(b.textContent));
  click(filterBtn);
  await settle(700);

  const chips = [...doc.querySelectorAll('.filter-chip')].map((c) => c.textContent.replace('✕', '').trim());
  assert.ok(chips.some((c) => c.startsWith('name =')), `filter chip added (got ${JSON.stringify(chips)})`);
  const ledgerAfterFilter = await (await fetch(`${base}/api/ledger`)).json();
  assert.equal(ledgerAfterFilter.data.changes.length, 0, 'filtering does not stage changes');

  // clear filters
  const clearBtn = [...quickBar.querySelectorAll('.btn-quick')].find((b) => /clear filters/i.test(b.textContent));
  click(clearBtn);
  await settle(700);
  assert.equal(doc.querySelectorAll('.filter-chip').length, 0, 'filter chips cleared');

  // ---- duplicate row --------------------------------------------------------
  // select a cell on a real row, then duplicate
  const entryIdx = headers.indexOf('entry');
  const entryCell = firstRow.querySelectorAll('.grid-cell')[entryIdx + 1];
  click(entryCell);
  await settle(120);
  const dupBtn = [...quickBar.querySelectorAll('.btn-quick')].find((b) => /duplicate row/i.test(b.textContent));
  assert.ok(!dupBtn.disabled, 'duplicate enabled with a selection');
  click(dupBtn);
  await settle(700);

  let ledger = (await (await fetch(`${base}/api/ledger`)).json()).data.changes;
  const inserts = ledger.filter((c) => c.kind === 'insert');
  assert.equal(inserts.length, 1, 'duplicating stages one insert');
  assert.equal(inserts[0].table, 'creature_template');
  assert.ok(inserts[0].snapshot.name, 'the copy carries the source row values');
  // creature_template.entry is an explicitly-assigned integer PK (no
  // AUTO_INCREMENT in the TC schema), so the copy gets a one-up unique id.
  const sourceEntry = 448;
  assert.notEqual(Number(inserts[0].key.entry), sourceEntry, 'duplicate gets a distinct key');
  assert.ok(Number(inserts[0].key.entry) > sourceEntry, 'duplicate key is one-up');

  // ---- delete row -----------------------------------------------------------
  const delBtn = [...quickBar.querySelectorAll('.btn-quick')].find((b) => /delete row/i.test(b.textContent));
  // select the Hogger row's entry cell (first db row)
  click(firstRow.querySelectorAll('.grid-cell')[entryIdx + 1]);
  await settle(120);
  click(delBtn);
  await settle(700);
  ledger = (await (await fetch(`${base}/api/ledger`)).json()).data.changes;
  const deletes = ledger.filter((c) => c.kind === 'delete');
  assert.equal(deletes.length, 1, 'deleting stages one delete');
  assert.deepEqual(deletes[0].key, { entry: 448 }, 'delete targets Hogger (entry 448)');

  assert.deepEqual(errors, [], 'no runtime errors during quick actions');
});
