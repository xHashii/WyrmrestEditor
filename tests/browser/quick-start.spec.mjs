import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const test = base.extend({
  runtimeErrors: [async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()); });
    await use();
    expect(errors).toEqual([]);
  }, { auto: true }],
});
const ledger = async (request) => (await (await request.get('/api/ledger')).json()).data.changes;
const home = (page) => page.getByRole('button', { name: 'Quick Start', exact: true });
async function loader(page) {
  await page.getByRole('button', { name: 'SmartAI editor', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Load a SmartAI script' })).toBeVisible();
  await expect(page.locator('.script-item').first()).toBeVisible();
}
async function hogger(page) {
  await loader(page);
  await page.getByRole('textbox', { name: 'Search scripts by name or entry' }).fill('Hogger');
  await expect(page.locator('.script-item')).toHaveCount(1);
  await page.locator('.script-item').click();
  await expect(page.locator('.smart-row')).toHaveCount(2);
}
async function noHorizontalOverflow(page, selector) {
  await expect.poll(() => page.locator(selector).evaluateAll((nodes) => nodes.filter((node) => node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1)
    .map((node) => ({ class: node.className, width: node.clientWidth, scroll: node.scrollWidth })))).toEqual([]);
}

test.beforeEach(async ({ page, request }) => {
  await request.post('/api/demo', { data: {} });
  await request.post('/api/ledger/clear', { data: {} });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Quick Start', exact: true })).toBeVisible();
});

test('Quick Start is the launch page and loads SmartAI by name without table hunting', async ({ page, request }) => {
  await expect(page.locator('.grid')).toHaveCount(0);
  const card = page.getByRole('button', { name: 'SmartAI editor', exact: true });
  const bounds = await card.boundingBox();
  expect(bounds.height).toBeGreaterThan(140);
  expect(bounds.width).toBeGreaterThan(400);
  await hogger(page);
  await page.getByRole('button', { name: 'SmartAI editor', exact: true }).click();
  await expect(page.locator('.script-chip strong')).toHaveText('Hogger');
  await expect(page.locator('.smart-row').nth(1).locator('.source-text')).toHaveText('Hogger: Cast spell Fireball on Victim');
  expect(await ledger(request)).toHaveLength(0);
});

test('recent scripts survive restart, reopen the right kind and can be cleared without losing edits', async ({ page, request }) => {
  await hogger(page);
  await page.getByRole('button', { name: 'Edit comment for row 0' }).click();
  let dialog = page.getByRole('dialog', { name: 'SmartAI row 0' });
  await dialog.getByLabel('Row comment').fill('A saved draft');
  await dialog.getByRole('button', { name: 'Stage changes' }).click();
  await expect(dialog).toHaveCount(0);
  await home(page).click();
  await expect(page.locator('.recent-item')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.recent-item')).toContainText('Hogger');
  await page.locator('.recent-item').click();
  await expect(page.locator('.smart-row')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Edit comment for row 0' })).toHaveText('A saved draft');
  await home(page).click();
  await page.getByRole('button', { name: 'Clear history' }).click();
  await expect(page.locator('.recent-item')).toHaveCount(0);
  expect(await ledger(request)).toHaveLength(1);
  await page.reload();
  await expect(page.locator('.recent-item')).toHaveCount(0);
});

test('home preserves table filters and prevents shortcuts from editing a hidden table', async ({ page, request }) => {
  await page.getByRole('button', { name: 'Creature templates', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search creature_template rows' }).fill('Hogger');
  await expect(page.locator('.grid-row')).toHaveCount(1);
  await page.locator('[data-column="name"][role="gridcell"]').click();
  await page.keyboard.press('Control+Shift+h');
  await expect(page.locator('.quick-start')).toBeVisible();
  for (const shortcut of ['Control+i', 'Control+d', 'Control+Delete']) await page.keyboard.press(shortcut);
  expect(await ledger(request)).toHaveLength(0);
  await page.getByRole('button', { name: /Return to workspace/ }).click();
  await expect(page.getByRole('textbox', { name: 'Search creature_template rows' })).toHaveValue('Hogger');
  await expect(page.locator('.grid-row')).toHaveCount(1);
  await home(page).click();
  await page.getByRole('navigation', { name: 'Databases' }).getByRole('button', { name: 'world', exact: true }).click();
  await expect(page.locator('.grid-row')).toHaveCount(1);
});

test('loading an ID validates input, preserves negative GUIDs and never stages on open', async ({ page, request }) => {
  await loader(page);
  const entry = page.getByRole('textbox', { name: 'Entry ID or GUID' });
  for (const value of ['oops', '0', '999999999999999999999999']) {
    await entry.fill(value);
    await entry.press('Enter');
    await expect(page.locator('.script-direct [role="alert"]')).toBeVisible();
    expect(await ledger(request)).toHaveLength(0);
  }
  await entry.fill('-987654');
  await entry.press('Enter');
  await expect(page.locator('.script-chip')).toContainText('entryorguid -987654');
  await expect(page.locator('.empty-script')).toBeVisible();
  expect(await ledger(request)).toHaveLength(0);
  await page.locator('.script-chip').click();
  const picker = page.getByRole('dialog', { name: 'Choose a script to edit' });
  await picker.getByLabel('Script type to open').selectOption('9');
  await picker.getByLabel('Entry ID or GUID').fill('448');
  await picker.getByRole('button', { name: 'Load script' }).click();
  await expect(picker).toHaveCount(0);
  await expect(page.locator('.script-chip-kind')).toHaveText('Timed action list');
  await expect(page.locator('.smart-row')).toHaveCount(0);
  expect(await ledger(request)).toHaveLength(0);
  await home(page).click();
  await expect(page.locator('.recent-item').first()).toContainText('entry 448 · type 9');
});

test('a new ID can start a script using the existing staged event editor', async ({ page, request }) => {
  await loader(page);
  await page.getByLabel('Entry ID or GUID').fill('987654');
  await page.getByRole('button', { name: 'Load script' }).click();
  await expect(page.locator('.empty-script')).toBeVisible();
  await page.getByRole('button', { name: '+ Event', exact: true }).click();
  const choices = page.getByRole('dialog', { name: 'New event for a Creature' });
  await choices.getByRole('combobox', { name: 'Search SmartAI events' }).fill('On aggro');
  await choices.getByRole('option').first().click();
  const row = page.getByRole('dialog', { name: 'SmartAI row 0' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Close row editor' }).click();
  const changes = await ledger(request);
  expect(changes).toHaveLength(1);
  expect(changes[0].kind).toBe('insert');
  expect(Number(changes[0].snapshot.entryorguid)).toBe(987654);
  expect(Number(changes[0].snapshot.source_type)).toBe(0);
});

test('definition and script-search failures have working retry paths', async ({ page }) => {
  await page.route('**/api/smart/data', (route) => route.fulfill({ status: 503, json: { ok: false, error: 'Definitions temporarily unavailable' } }));
  await page.getByRole('button', { name: 'SmartAI editor', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Definitions temporarily unavailable');
  await page.unroute('**/api/smart/data');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.script-item').first()).toBeVisible();
  await page.route('**/api/smart/scripts', (route) => route.fulfill({ status: 503, json: { ok: false, error: 'Script search is offline' } }));
  await page.getByLabel('Search scripts by name or entry').fill('Hogger');
  await expect(page.getByRole('alert')).toContainText('Script search is offline');
  await page.unroute('**/api/smart/scripts');
  await page.getByRole('button', { name: 'Retry script search' }).click();
  await expect(page.locator('.script-item')).toHaveCount(1);
  await expect(page.locator('.script-item')).toContainText('Hogger');
});

test('Quick Start remains usable with corrupt or blocked local storage', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('wyrmrest.recent.v1', '{broken'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Quick Start', exact: true })).toBeVisible();
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage denied'); } }));
  await page.reload();
  await hogger(page);
  await home(page).click();
  await expect(page.locator('.recent-item')).toContainText('Hogger');
  await expect(page.locator('.start-recent .notice')).toContainText('this session only');
});

test('full-value editing is available without the inspector and long values reopen in the multiline editor', async ({ page, request }) => {
  await page.getByRole('button', { name: 'Creature templates', exact: true }).click();
  await page.getByRole('button', { name: 'Inspector', exact: true }).click();
  await page.locator('.grid-row').first().locator('[data-column="name"]').click();
  await page.getByRole('button', { name: 'Expand / edit value', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit name', exact: true });
  const long = `Every word remains editable.\n${'Unbroken_text_'.repeat(180)}\nLast line.`;
  await dialog.getByRole('textbox', { name: 'name', exact: true }).fill(long);
  await dialog.getByRole('button', { name: 'Stage value' }).click();
  await expect(dialog).toHaveCount(0);
  expect((await ledger(request))[0].values.name.after).toBe(long);
  await page.locator('.grid-row').first().locator('[data-column="name"]').dblclick();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'name', exact: true })).toHaveValue(long);
  await noHorizontalOverflow(page, '.dialog-surface, .value-input');
  await dialog.getByRole('textbox', { name: 'name', exact: true }).fill(`${long}\nEdited again.`);
  await dialog.getByRole('textbox', { name: 'name', exact: true }).press('Control+Enter');
  await expect(dialog).toHaveCount(0);
  expect((await ledger(request))[0].values.name.after).toBe(`${long}\nEdited again.`);
});

for (const [width, height] of [[1600, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844], [320, 740]]) {
  test(`Quick Start, long script text and row/definition editors fit at ${width}×${height}`, async ({ page, request }) => {
    await page.setViewportSize({ width, height });
    await noHorizontalOverflow(page, '.app, .topbar, .quick-start, .quick-card, .start-panel');
    const name = 'AnExtremelyLongCreatureNameWithoutAnyBreaks'.repeat(12);
    await page.route('**/api/smart/scripts', async (route) => {
      const response = await route.fetch();
      const payload = await response.json();
      payload.data = payload.data.filter((item) => Number(item.entryorguid) === 448).map((item) => ({ ...item, name, nameResolved: true }));
      await route.fulfill({ json: payload });
    });
    await loader(page);
    await noHorizontalOverflow(page, '.app, .main, .smart-editor, .script-picker, .script-direct, .script-item');
    await expect(page.locator('.script-item .script-count')).toBeVisible();
    await expect(page.locator('.script-item .script-entry')).toBeVisible();
    await page.locator('.script-item').click();
    await expect(page.locator('.smart-row')).toHaveCount(2);
    await page.getByRole('button', { name: 'Edit comment for row 0' }).click();
    const row = page.getByRole('dialog', { name: 'SmartAI row 0' });
    const long = `First line.\n${'CommentWithoutSpaces'.repeat(100)}\nLast line stays visible.`;
    await row.getByLabel('Row comment').fill(long);
    await noHorizontalOverflow(page, '.dialog-surface, .modal-head, .modal-foot, .smart-section, .smart-def, .comment-input');
    await row.getByRole('button', { name: 'Stage changes', exact: true }).click();
    await expect(row).toHaveCount(0);
    expect((await ledger(request))[0].values.comment.after).toBe(long);
    await noHorizontalOverflow(page, '.app, .main, .smart-toolbar, .script-chip, .smart-rows, .smart-row, .source-cell, .smart-row-comment');
    await expect(page.getByRole('button', { name: 'Edit comment for row 0' })).toHaveText(long);
    await page.getByRole('button', { name: 'Edit comment for row 0' }).click();
    await expect(row.getByLabel('Row comment')).toHaveValue(long);
    await row.getByRole('button', { name: 'Change', exact: true }).first().click();
    const picker = page.getByRole('dialog', { name: 'SmartAI event', exact: true });
    await expect(picker).toBeVisible();
    await noHorizontalOverflow(page, '.definition-picker, .definition-list, .definition-item');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await home(page).click();
    await noHorizontalOverflow(page, '.quick-start, .recent-item, .start-panel');
    await expect(page.locator('.recent-item').first()).toContainText(name);
  });
}

test('Quick Start and the inline script loader pass automated WCAG A/AA checks', async ({ page }) => {
  let result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
  await loader(page);
  result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});
