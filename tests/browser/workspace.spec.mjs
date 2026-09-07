import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';

const test = base.extend({
  runtimeErrors: [async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text());
    });
    await use(errors);
    expect(errors, 'no renderer exceptions or React errors').toEqual([]);
  }, { auto: true }],
});

const cell = (page, column, row = 0) => page.locator('.grid-row').nth(row).locator(`[data-column="${column}"]`);
const ledger = async (request) => (await (await request.get('/api/ledger')).json()).data.changes;
async function editName(page, value, row = 0) {
  await cell(page, 'name', row).dblclick();
  const input = page.getByRole('textbox', { name: 'Edit name', exact: true });
  await input.fill(value);
  await input.press('Enter');
  await expect(input).toHaveCount(0);
  await expect(cell(page, 'name', row)).toHaveText(value);
}
async function jump(page, column) {
  await page.getByLabel('Jump to column').selectOption(column);
  await expect(page.locator('.grid-cell.cell-selected')).toHaveAttribute('data-column', column);
}

test.beforeEach(async ({ page, request }) => {
  await request.post('/api/demo', { data: {} });
  await request.post('/api/ledger/clear', { data: {} });
  await request.post('/api/settings', { data: { pageSize: 100, profiles: [{ id: 'local', name: 'Local TrinityCore', host: '127.0.0.1', port: 3306, user: 'trinity', password: '', databases: { auth: 'auth', characters: 'characters', world: 'world', hotfixes: 'hotfixes' } }] } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Creature templates', exact: true }).click();
  await expect(page.locator('.grid-row')).toHaveCount(15);
});

test('edit, refresh, round-trip revert, Escape, and blur preserve the correct values', async ({ page, request }) => {
  await editName(page, 'Hogger edited');
  expect(await ledger(request)).toHaveLength(1);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(cell(page, 'name')).toHaveText('Hogger edited');
  await editName(page, 'Hogger');
  expect(await ledger(request)).toHaveLength(0);
  await cell(page, 'name').dblclick();
  await page.getByRole('textbox', { name: 'Edit name', exact: true }).fill('Do not keep this');
  await page.keyboard.press('Escape');
  await expect(cell(page, 'name')).toHaveText('Hogger');
  expect(await ledger(request)).toHaveLength(0);
  await cell(page, 'name').dblclick();
  await page.getByRole('textbox', { name: 'Edit name', exact: true }).fill('Saved on blur');
  await cell(page, 'name', 1).click();
  await expect(cell(page, 'name')).toHaveText('Saved on blur');
  const changes = await ledger(request);
  expect(changes).toHaveLength(1);
  expect(changes[0].values.name).toEqual({ before: 'Hogger', after: 'Saved on blur' });
});

test('invalid numbers show a recoverable error without silently becoming zero', async ({ page, request }) => {
  await jump(page, 'BaseAttackTime');
  await cell(page, 'BaseAttackTime').dblclick();
  const input = page.getByRole('textbox', { name: 'Edit BaseAttackTime' });
  await input.fill('12oops');
  await input.press('Enter');
  await expect(page.locator('.edit-error')).toContainText('whole number');
  expect(await ledger(request)).toHaveLength(0);
  await expect(input).toBeVisible();
  await input.fill('2500');
  await input.press('Enter');
  await expect(page.locator('.edit-error')).toHaveCount(0);
  await expect(cell(page, 'BaseAttackTime')).toHaveText('2500');
});

test('empty-string filtering and empty pagination have clear recovery actions', async ({ page }) => {
  await jump(page, 'subname');
  await page.getByRole('button', { name: 'Filter by cell', exact: true }).click();
  await expect(page.locator('.filter-chip')).toContainText('subname = (empty string)');
  await expect(page.locator('.grid-row').first()).toContainText('Hogger');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search creature_template rows' }).fill('no-such-creature-999');
  await expect(page.locator('.grid-empty')).toContainText('No matching rows');
  await expect(page.locator('.pager-label')).toHaveText('0 of 0');
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Clear search & filters' }).click();
  await expect(page.locator('.grid-row')).toHaveCount(15);
});

test('64-bit flag editor escapes the grid, retains precision and restores keyboard focus', async ({ page, request }) => {
  await jump(page, 'npcflag');
  await cell(page, 'npcflag').dblclick();
  const dialog = page.getByRole('dialog', { name: /flags$/ });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(1440);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
  await expect(page.locator('#root')).toHaveAttribute('inert', '');
  await dialog.getByLabel('Raw value', { exact: true }).fill('9223372036854775808');
  await dialog.locator('.flag-row').filter({ has: page.locator('.flag-name', { hasText: /^Vendor$/ }) }).getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Stage value', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect((await ledger(request))[0].values.npcflag.after).toBe('9223372036854775936');
  await expect(page.locator('.grid')).toBeFocused();
  await expect(page.locator('.docs .full-value')).toHaveText('9223372036854775936');
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('reference searches show names and reject invalid raw IDs', async ({ page, request }) => {
  await jump(page, 'faction');
  await cell(page, 'faction').dblclick();
  const picker = page.getByRole('dialog', { name: /reference picker$/ });
  await picker.getByLabel('Raw ID', { exact: true }).fill('not-an-id');
  await picker.getByRole('button', { name: 'Set', exact: true }).click();
  await expect(picker.getByRole('alert')).toContainText('whole number');
  expect(await ledger(request)).toHaveLength(0);
  await picker.getByRole('textbox', { name: 'Search references' }).fill('Stormwind');
  await picker.getByRole('button', { name: /12 Stormwind/ }).click();
  await expect(picker).toHaveCount(0);
  await expect(cell(page, 'faction')).toContainText('Stormwind');
  expect((await ledger(request))[0].values.faction.after).toBe(12);
});

test('database tabs switch context atomically and remember the last table', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Databases' }).getByRole('button', { name: 'auth', exact: true }).click();
  await expect(page.locator('.table-title')).toContainText('auth.account');
  await expect(page.locator('.grid')).toHaveAttribute('aria-label', 'account rows');
  await expect(page.locator('.query-error')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Databases' }).getByRole('button', { name: 'world', exact: true }).click();
  await expect(page.locator('.table-title')).toContainText('world.creature_template');
  await expect(cell(page, 'name')).toHaveText('Hogger');
});

test('table finder handles zero results and scrolls the keyboard cursor into view', async ({ page }) => {
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox', { name: 'Search all tables' });
  await input.fill('no_such_table_xxx');
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(page.locator('.palette-empty')).toContainText('No table matches');
  await input.fill('creature');
  for (let i = 0; i < 35; i++) await input.press('ArrowDown');
  const active = await page.locator('.palette-item.active').boundingBox();
  const list = await page.locator('.palette-list').boundingBox();
  expect(active.y).toBeGreaterThanOrEqual(list.y - 1);
  expect(active.y + active.height).toBeLessThanOrEqual(list.y + list.height + 1);
  await input.fill('world.smart_scripts');
  await input.press('Enter');
  await expect(page.locator('.table-title')).toContainText('world.smart_scripts');
  await expect(page.locator('.grid-row').first()).toContainText('Hogger - On Aggro');
});

test('selected export writes only the reviewed change and offers an actual download', async ({ page, request }) => {
  await editName(page, 'Hogger exported');
  await editName(page, 'Defias still staged', 1);
  await page.getByRole('button', { name: /Staged changes 2/ }).click();
  await page.locator('.ledger-item').first().getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Export selected (1)', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export staged changes', exact: true });
  await expect(dialog.locator('.export-file pre')).toContainText('Hogger exported');
  await expect(dialog.locator('.export-file pre')).not.toContainText('Defias still staged');
  await dialog.getByRole('checkbox', { name: 'Remove exported changes from the ledger' }).check();
  await dialog.getByRole('button', { name: 'Write SQL files', exact: true }).click();
  const done = page.getByRole('dialog', { name: 'SQL export complete' });
  await expect(done).toBeVisible();
  await expect(done.locator('.success-box')).toContainText('No changes have been applied');
  const downloadPromise = page.waitForEvent('download');
  await done.getByRole('button', { name: 'Download SQL', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^\d{4}_\d{2}_\d{2}_\d{2,}_world\.sql$/);
  expect(await fs.readFile(await download.path(), 'utf8')).toContain("SET `name`='Hogger exported' WHERE `entry`=448");
  const remaining = await ledger(request);
  expect(remaining).toHaveLength(1);
  expect(remaining[0].values.name.after).toBe('Defias still staged');
  await done.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(cell(page, 'name')).toHaveText('Hogger');
});

test('discard is confirmed in the app and cancel leaves the work intact', async ({ page, request }) => {
  await editName(page, 'Keep until confirmed');
  await page.getByRole('button', { name: /Staged changes 1/ }).click();
  await page.getByRole('button', { name: 'Discard all', exact: true }).click();
  let confirm = page.getByRole('dialog', { name: 'Discard all staged changes?' });
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await ledger(request)).toHaveLength(1);
  await page.getByRole('button', { name: 'Discard all', exact: true }).click();
  confirm = page.getByRole('dialog', { name: 'Discard all staged changes?' });
  await confirm.getByRole('button', { name: 'Discard all changes', exact: true }).click();
  await expect(confirm).toHaveCount(0);
  expect(await ledger(request)).toHaveLength(0);
  await expect(cell(page, 'name')).toHaveText('Hogger');
});

test('connection errors are complete, saved profiles do not switch the active connection', async ({ page, request }) => {
  await page.getByRole('button', { name: 'demo data', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Database connection' });
  await dialog.getByLabel('Port', { exact: true }).fill('1');
  await dialog.getByRole('button', { name: 'Test connection', exact: true }).click();
  await expect(dialog.locator('.connection-results')).toContainText('ECONNREFUSED');
  await expect(dialog.locator('.connection-current')).toContainText('Demo data');
  const errors = await dialog.locator('.status-pill').allTextContents();
  expect(errors).toHaveLength(4);
  expect(errors.every((message) => message.includes('127.0.0.1:1') && !message.includes('…'))).toBeTruthy();
  await dialog.getByRole('button', { name: 'Save profiles', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Save profiles', exact: true })).toBeDisabled();
  const settings = (await (await request.get('/api/settings')).json()).data;
  expect(settings.activeProfileId).toBe(null);
  expect(settings.mode).toBe('demo');
  expect(settings.profiles[0].port).toBe(1);
  await dialog.getByRole('button', { name: 'Close connection settings' }).click();
  await expect(dialog).toHaveCount(0);
});

test('dialogs trap focus, block row shortcuts and confirm unsaved profile dismissal', async ({ page, request }) => {
  await page.getByRole('button', { name: 'demo data', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Database connection' });
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBeTruthy();
  }
  await page.keyboard.press('Control+i');
  expect(await ledger(request)).toHaveLength(0);
  await dialog.getByLabel('Profile name', { exact: true }).fill('Unsaved server name');
  await page.keyboard.press('Escape');
  const confirmation = page.getByRole('dialog', { name: 'Discard unsaved profile changes?' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog.getByLabel('Profile name', { exact: true })).toHaveValue('Unsaved server name');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Discard profile changes', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'demo data', exact: true })).toBeFocused();
});

for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
  test(`controls, selected columns and inspector stay reachable at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const name of ['Find table', 'Tables', 'Inspector', 'Export SQL']) {
      const button = page.getByRole('button', { name, exact: name !== 'Find table' });
      await button.scrollIntoViewIfNeeded();
      const box = await button.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    }
    await jump(page, 'VerifiedBuild');
    const grid = await page.locator('.grid').boundingBox();
    const selected = await page.locator('.grid-cell.cell-selected').boundingBox();
    expect(selected.x).toBeGreaterThanOrEqual(grid.x);
    expect(selected.x + selected.width).toBeLessThanOrEqual(grid.x + grid.width + 1);
    expect(grid.height).toBeGreaterThanOrEqual(140);
    const toggle = page.getByRole('button', { name: 'Inspector', exact: true });
    if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
    await expect(page.locator('.docs .full-value')).toBeVisible();
    await page.locator('.docs').getByRole('button', { name: 'Expand / edit' }).click();
    const editor = page.getByRole('dialog', { name: 'Edit VerifiedBuild', exact: true });
    await expect(editor.getByRole('button', { name: 'Stage value', exact: true })).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(editor).toHaveCount(0);
    if (width <= 900) {
      await expect(page.getByRole('dialog', { name: 'Inspector', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  });
}

test('workspace and connection dialog meet automated WCAG A/AA checks', async ({ page }) => {
  await cell(page, 'name').click();
  let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole('button', { name: 'demo data', exact: true }).click();
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('a failed boot exposes the error and Retry brings back the workspace', async ({ page }) => {
  await page.route('**/api/metadata', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Service temporarily unavailable' }) }));
  await page.reload();
  await expect(page.locator('.boot-error')).toHaveText('Service temporarily unavailable');
  await page.unroute('**/api/metadata');
  await page.getByRole('button', { name: 'Retry connection' }).click();
  await expect(page.getByRole('heading', { name: 'Quick Start', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Creature templates', exact: true }).click();
  await expect(page.locator('.grid-row')).toHaveCount(15);
});

test('a stale SQL preview cannot overwrite a newer content version', async ({ page }) => {
  await editName(page, 'Preview race');
  await page.getByRole('button', { name: 'Export SQL', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export staged changes', exact: true });
  await expect(dialog.locator('.export-file pre')).toBeVisible();
  let release;
  let started;
  const delayed = new Promise((resolve) => { release = resolve; });
  const arrived = new Promise((resolve) => { started = resolve; });
  await page.route('**/api/ledger/export', async (route) => {
    if (route.request().postDataJSON().version !== '3.4.4') return route.continue();
    const response = await route.fetch();
    started();
    await delayed;
    await route.fulfill({ response });
  });
  await dialog.getByLabel('Content version').fill('3.4.4');
  await arrived;
  await dialog.getByLabel('Content version').fill('3.4.5');
  await expect(dialog.locator('.export-file-head code')).toContainText('/3.4.5/');
  const late = page.waitForResponse((response) => response.url().endsWith('/api/ledger/export') && response.request().postDataJSON().version === '3.4.4');
  release();
  await (await late).finished();
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(dialog.locator('.export-file-head code')).toContainText('/3.4.5/');
});

test('API failures use readable JSON envelopes and reject unsafe request shapes', async ({ request }) => {
  let response = await request.get('/api/not-a-route');
  expect(response.status()).toBe(404);
  expect((await response.json()).error).toBe('Unknown API route.');
  response = await request.post('/api/query', { data: '{', headers: { 'content-type': 'application/json' } });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toBe('Invalid JSON request body.');
  response = await request.post('/api/ledger/clear', { data: 'clear=true', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  expect(response.status()).toBe(415);
  response = await request.post('/api/query', { data: { database: 'world', table: 'creature_template', limit: -1 } });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain('pagination');
});

test('clipboard denial is shown as an error, never a false success', async ({ page }) => {
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Permission denied'); } } }));
  await cell(page, 'name').click();
  await page.getByRole('button', { name: 'Copy value', exact: true }).click();
  await expect(page.locator('.toast-error')).toContainText('Could not copy. Permission denied');
  await expect(page.locator('.toast-success')).toHaveCount(0);
});

test('resizing after selecting a distant column keeps the selected cell in view', async ({ page }) => {
  await jump(page, 'npcflag');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => {
    const grid = await page.locator('.grid').boundingBox();
    const selected = await page.locator('.grid-cell.cell-selected').boundingBox();
    return selected.x >= grid.x && selected.x + selected.width <= grid.x + grid.width + 1;
  }).toBe(true);
});

test('failed staging keeps the modal draft and shows the actual error inside the editor', async ({ page, request }) => {
  await jump(page, 'npcflag');
  await cell(page, 'npcflag').dblclick();
  const dialog = page.getByRole('dialog', { name: /flags$/ });
  await dialog.getByLabel('Raw value', { exact: true }).fill('42');
  await page.route('**/api/ledger/stage', (route) => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'The ledger is temporarily read-only.' }) }));
  await dialog.getByRole('button', { name: 'Stage value', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('The ledger is temporarily read-only.');
  await expect(dialog.getByLabel('Raw value', { exact: true })).toHaveValue('42');
  expect(await ledger(request)).toHaveLength(0);
  await page.unroute('**/api/ledger/stage');
  await dialog.getByRole('button', { name: 'Stage value', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect((await ledger(request))[0].values.npcflag.after).toBe(42);
  await expect(page.locator('.toast-error')).toHaveCount(0);
});
