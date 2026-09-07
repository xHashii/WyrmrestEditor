import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const openTable = async (page, name) => {
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: 'Search all tables' }).fill(name);
  await page.getByRole('combobox', { name: 'Search all tables' }).press('Enter');
  await expect(page.locator('.palette-list')).toHaveCount(0);
  await expect(page.locator('.table-title')).toContainText(name);
};

const searchRows = async (page, value) => {
  const box = page.getByLabel('Search smart_scripts rows');
  await box.fill(value);
  await box.press('Enter');
};

const ledger = async (request) => (await (await request.get('/api/ledger')).json()).data.changes;
/** Staging is async (and sometimes several entries deep), so wait for the count. */
const ledgerWith = async (request, count) => {
  await expect.poll(() => ledger(request).then((changes) => changes.length), { timeout: 5000 }).toBe(count);
  return ledger(request);
};

test.beforeEach(async ({ page, request }) => {
  await request.post('/api/demo', { data: {} });
  await request.post('/api/ledger/clear', { data: {} });
  await page.goto('/');
  await page.getByRole('button', { name: 'Creature templates', exact: true }).click();
  await expect(page.locator('.grid-row')).toHaveCount(15);
});

test('the search box resolves referenced names, and the scope narrows what it looks at', async ({ page }) => {
  await openTable(page, 'world.smart_scripts');
  await expect(page.locator('.grid-row')).toHaveCount(8);

  // A spell name finds the row that only stores an id.
  await searchRows(page, 'spell:Fireball');
  await expect(page.locator('.grid-row')).toHaveCount(1);
  await expect(page.locator('.grid-row').first()).toContainText('Cast Fireball');
  await expect(page.locator('.trace-chip')).toContainText('Fireball (133)');

  // A creature name finds every script row of that creature through entryorguid.
  await searchRows(page, 'Hogger');
  await expect(page.locator('.grid-row')).toHaveCount(2);
  await expect(page.locator('.grid-row').nth(0)).toContainText('On Aggro');
  await expect(page.locator('.grid-row').nth(1)).toContainText('Cast Fireball');

  // IDs-only scope must not fall back to names.
  await page.getByLabel('What to search').selectOption('ids');
  await searchRows(page, 'Fireball');
  await expect(page.locator('.grid-row')).toHaveCount(0);
  await page.getByLabel('What to search').selectOption('all');
  await searchRows(page, '448');
  await expect(page.locator('.grid-row')).toHaveCount(2);

  // An unusable prefix is explained instead of silently returning nothing.
  await searchRows(page, 'nosuchthing:x');
  await expect(page.locator('.trace-note').first()).toBeVisible();
});

test('the SmartAI editor opens the script of a row and shows it as sentences', async ({ page }) => {
  await openTable(page, 'world.smart_scripts');
  await page.locator('.grid-row').first().locator('[data-column="comment"]').click();
  await page.getByRole('button', { name: 'SmartAI editor' }).click();

  const editor = page.getByRole('region', { name: 'SmartAI script editor' });
  await expect(editor).toBeVisible();
  await expect(page.locator('.script-chip strong')).toHaveText('Hogger');
  await expect(page.locator('.smart-row')).toHaveCount(2);
  await expect(page.locator('.smart-row').first().locator('.source-label').first()).toHaveText('On aggro');
  await expect(page.locator('.smart-row').first()).toContainText('Say Line 1');
  // Parameters are resolved to names, not left as bare ids.
  await expect(page.locator('.smart-row').nth(1)).toContainText('Fireball');
  // The raw table is still one click away, with the same rows.
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(page.locator('.grid-row')).toHaveCount(2);
});

test('adding an action stages a new row and chains it to the event', async ({ page, request }) => {
  await openTable(page, 'world.smart_scripts');
  await page.getByRole('button', { name: 'SmartAI editor' }).click();
  await expect(page.locator('.smart-row')).toHaveCount(2);

  await page.locator('.smart-row').first().getByRole('button', { name: 'Add action' }).click();
  const picker = page.getByRole('dialog', { name: 'Action for “On aggro”' });
  await expect(picker).toBeVisible();
  await picker.getByRole('combobox', { name: 'Search SmartAI actions' }).fill('play emote');
  await picker.getByRole('option', { name: /Play emote/ }).first().click();

  // The row dialog opens on the new row so its parameters can be filled in.
  const dialog = page.getByRole('dialog', { name: 'SmartAI row 2' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close row editor' }).click();

  let changes = await ledgerWith(request, 2);
  const insert = changes.find((change) => change.kind === 'insert');
  expect(Number(insert.values.action_type.after)).toBe(5); // SMART_ACTION_PLAY_EMOTE
  expect(insert.note).toContain('New SmartAI action');
  const link = changes.find((change) => change.kind === 'update');
  expect(link.values.link).toEqual({ before: 0, after: 2 });

  await expect(page.locator('.smart-row').first().locator('.smart-row-line.chained')).toHaveCount(1);
  await expect(page.locator('.row-id.chain')).toHaveText('↳ #2');
});

test('the row editor changes an event and stages only the columns that moved', async ({ page, request }) => {
  await openTable(page, 'world.smart_scripts');
  await page.getByRole('button', { name: 'SmartAI editor' }).click();
  await page.locator('.smart-row').first().locator('.source-cell.event').click();

  const dialog = page.getByRole('dialog', { name: 'SmartAI row 0' });
  await expect(dialog.getByRole('heading', { name: 'Edit event · row #0' })).toBeVisible();
  await expect(dialog).toContainText('On creature aggro');
  await dialog.getByLabel('Event chance, percent').fill('50');
  await expect(dialog.getByText('1 column changed', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Stage changes' }).click();
  await expect(dialog).toHaveCount(0);

  const changes = await ledgerWith(request, 1);
  expect(changes[0].values).toEqual({ event_chance: { before: 100, after: 50 } });
  // The script row now shows the chance, because 100 is the default.
  await expect(page.locator('.smart-row').first().locator('.chip.chance')).toHaveText('50%');
});

test('moving an event renumbers the script and keeps every link valid', async ({ page, request }) => {
  await openTable(page, 'world.smart_scripts');
  await page.getByRole('button', { name: 'SmartAI editor' }).click();
  await expect(page.locator('.smart-row').nth(1)).toContainText('Cast Fireball');

  await page.locator('.smart-row').nth(1).hover();
  await page.locator('.smart-row').nth(1).getByRole('button', { name: 'Move row 1 up' }).click();

  await expect(page.locator('.smart-row').first()).toContainText('Cast Fireball');
  const changes = await ledgerWith(request, 2);
  const ids = changes.map((change) => change.values.id?.after).sort();
  expect(ids).toEqual([0, 1]);
  // No row may keep a link into the old numbering.
  for (const change of changes) expect(change.values.link?.after ?? 0).toBeLessThanOrEqual(1);
});

test('deleting a chained row reconnects the row that pointed at it', async ({ page, request }) => {
  await openTable(page, 'world.smart_scripts');
  await page.getByRole('button', { name: 'SmartAI editor' }).click();
  await page.locator('.smart-row').first().getByRole('button', { name: 'Add action' }).click();
  const picker = page.getByRole('dialog', { name: 'Action for “On aggro”' });
  await picker.getByRole('combobox', { name: 'Search SmartAI action' }).fill('emote');
  await picker.getByRole('option').first().click();
  const dialog = page.getByRole('dialog', { name: 'SmartAI row 2' });
  await dialog.getByRole('button', { name: 'Close row editor' }).click();
  await expect(page.locator('.smart-row-line.chained')).toHaveCount(1);

  await page.locator('.smart-row-line.chained').hover();
  await page.locator('.smart-row-line.chained').getByRole('button', { name: 'Delete row 2' }).click();

  // Removing a row that was only staged must leave no trace at all: the insert
  // is cancelled and the link that pointed at it reverts to its stored value.
  await expect(page.locator('.smart-row-line.chained')).toHaveCount(0);
  expect(await ledger(request)).toHaveLength(0);

  await page.locator('.smart-row').nth(1).hover();
  await page.locator('.smart-row').nth(1).getByRole('button', { name: 'Delete row 1' }).click();
  const changes = await ledgerWith(request, 1);
  expect(changes[0].kind).toBe('delete');
  await expect(page.locator('.smart-row')).toHaveCount(1);
  await expect(page.locator('.removed-notice')).toContainText('1 row staged for deletion');
  await page.locator('.removed-notice').click();
  await expect(page.locator('.smart-row')).toHaveCount(2);
  await expect.poll(() => ledger(request).then((changes) => changes.length), { timeout: 5000 }).toBe(0);
});

test('the script view stays readable and accessible', async ({ page }) => {
  await openTable(page, 'world.smart_scripts');
  await page.getByRole('button', { name: 'SmartAI editor' }).click();
  await expect(page.locator('.smart-row')).toHaveCount(2);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});
