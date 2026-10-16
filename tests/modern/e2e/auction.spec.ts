import { test, expect, type Page } from '@playwright/test';
import { read, utils, write } from 'xlsx';
import { readFile } from 'node:fs/promises';
import type { Snapshot } from '../../../src/domain/types';
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(crypto, 'getRandomValues', {
      value: (values: Uint32Array) => {
        values.fill(0);
        return values;
      },
    });
  });
});
async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('auction-house-v3');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return new Promise<Snapshot>((resolve, reject) => {
      const t = db.transaction('snapshots', 'readonly'),
        r = t.objectStore('snapshots').getAll();
      r.onsuccess = () => resolve(r.result[0]);
      r.onerror = () => reject(r.error);
      t.oncomplete = () => db.close();
    });
  });
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  if (
    new URL(page.url()).pathname === '/auction' &&
    (page.viewportSize()?.width ?? 0) >= 1101
  )
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= window.innerHeight,
      ),
    ).toBe(true);
}
async function pauseAuto(page: Page) {
  await page.getByLabel('Auto-spin next player').uncheck();
}
async function start(page: Page) {
  await page
    .getByRole('button', { name: /Start bidding|Spin next player/ })
    .click();
  await expect(page.getByRole('button', { name: 'Mark sold' })).toBeVisible();
}
async function sell(page: Page, amount: string, team: string) {
  await page.getByLabel('Sale amount', { exact: true }).fill(amount);
  await page
    .getByLabel('Winning team', { exact: true })
    .selectOption({ label: team });
  await page.getByRole('button', { name: 'Mark sold', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}
async function sellIndex(page: Page, amount: string, index: number) {
  await page.getByLabel('Sale amount', { exact: true }).fill(amount);
  await page
    .getByLabel('Winning team', { exact: true })
    .selectOption({ index: index + 1 });
  await page.getByRole('button', { name: 'Mark sold', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}
async function markUnsold(page: Page) {
  await page.getByRole('button', { name: 'Mark unsold' }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}
async function go(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('header')).toBeVisible();
}
test('complete main and retry rounds, correct sale, export real Excel and resume', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await go(page, '/auction');
  await pauseAuto(page);
  const cases: [string | undefined, number][] = [
    ['250', 0],
    [undefined, 0],
    ['400', 1],
    ['300', 2],
    ['500', 3],
    [undefined, 0],
  ];
  for (const [amount, team] of cases) {
    await start(page);
    if (amount) await sellIndex(page, amount, team);
    else await markUnsold(page);
  }
  await page.getByRole('link', { name: 'View results & export' }).click();
  await expect(
    page.getByRole('button', { name: 'Export Excel' }),
  ).toBeEnabled();
  let s = await snapshot(page);
  expect(s.outcomes).toHaveLength(6);
  await page
    .getByRole('link', { name: 'Unsold re-auction', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Auction unsold players (2)' })
    .click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await start(page);
  await sellIndex(page, '750', 0);
  await start(page);
  await markUnsold(page);
  await page.getByRole('link', { name: 'Review unsold players' }).click();
  await page
    .getByRole('button', { name: 'Auction unsold players (1)' })
    .click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await start(page);
  await sellIndex(page, '300', 2);
  await page.getByRole('link', { name: 'View results & export' }).click();
  s = await snapshot(page);
  expect(s.players).toHaveLength(6);
  expect(s.outcomes).toHaveLength(9);
  expect(
    s.outcomes
      .filter((o) => o.status === 'SOLD')
      .reduce((n, o) => n + o.amountMinor!, 0),
  ).toBe(2500);
  await page.getByRole('button', { name: 'Correct sale' }).first().click();
  await page.getByLabel('Corrected amount').fill('200');
  await page.getByLabel('Correction reason').fill('Entry correction');
  await page.getByRole('button', { name: 'Review correction' }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Excel' }).click();
  const file = await downloadPromise;
  const path = await file.path();
  const wb = read(await readFile(path!), { type: 'buffer' });
  expect(wb.SheetNames).toHaveLength(5);
  expect(utils.sheet_to_json(wb.Sheets['Player Results'])).toHaveLength(6);
  expect(utils.sheet_to_json(wb.Sheets['Auction History'])).toHaveLength(10);
  await page.reload();
  expect((await snapshot(page)).corrections).toHaveLength(1);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath('results-desktop.png'),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test('sidebar preserves amount and winner during animation, refresh recovers selection', async ({
  page,
}) => {
  await go(page, '/auction');
  await pauseAuto(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Start bidding' }).click();
  await expect(
    page.getByRole('img', { name: 'Selecting the next player' }),
  ).toBeVisible();
  await expect(page.locator('.wheel-wrap')).not.toContainText('Arjun');
  await page.getByRole('button', { name: 'Collapse teams' }).click();
  const selected = (await snapshot(page)).currentSelection;
  await page.getByRole('button', { name: 'Expand teams' }).click();
  await expect(page.getByRole('button', { name: 'Mark sold' })).toBeVisible();
  await page.getByLabel('Sale amount', { exact: true }).fill('25');
  await page.getByRole('button', { name: 'Collapse teams' }).click();
  await expect(page.getByLabel('Sale amount', { exact: true })).toHaveValue(
    '25',
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Mark sold' })).toBeVisible();
  expect((await snapshot(page)).currentSelection).toEqual(selected);
  await expect(
    page.getByRole('button', { name: 'Expand teams' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mark unsold' }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Spin next player' }),
  ).toBeVisible();
});
test('real XLSX import, private fields excluded, invalid files do not replace roster', async ({
  page,
}) => {
  await go(page, '/import');
  await page
    .getByLabel('Registration file')
    .setInputFiles('public/samples/player-registrations.xlsx');
  await expect(
    page.getByText('6 player rows · 0 validation errors'),
  ).toBeVisible();
  await expect(page.locator('.privacy')).toContainText('Email');
  await page
    .getByRole('button', { name: 'Confirm import', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page).toHaveURL(/\/teams/);
  let s = await snapshot(page);
  expect(s.isSample).toBe(false);
  expect(s.players).toHaveLength(6);
  expect(JSON.stringify(s)).not.toContain('@example.com');
  expect(JSON.stringify(s)).not.toContain('9000000001');
  await go(page, '/import');
  await page.getByLabel('Registration file').setInputFiles({
    name: 'bad.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('not a workbook'),
  });
  await expect(page.getByRole('alert')).toBeVisible();
  s = await snapshot(page);
  expect(s.players).toHaveLength(6);
  await page.getByLabel('Registration file').setInputFiles({
    name: 'invalid.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('RegistrationID,FullName,Age\nA,Alex,121\nA,,22'),
  });
  await expect(
    page.getByRole('button', { name: 'Confirm import', exact: true }),
  ).toBeDisabled();
  expect((await snapshot(page)).players).toHaveLength(6);
});
test('teams, players, settings, squad capacity, budget validation and unit lock', async ({
  page,
}) => {
  await go(page, '/teams');
  await page.getByRole('button', { name: 'Add team', exact: true }).click();
  await page.getByLabel('Team name', { exact: true }).fill('Test Club');
  await page.getByLabel('Short name').fill('TC');
  await page.getByLabel('Starting budget (points)').fill('50');
  await page.getByLabel('Maximum players').fill('1');
  await page.getByRole('button', { name: 'Save team' }).click();
  await expect(page.getByRole('heading', { name: 'Test Club' })).toBeVisible();
  await go(page, '/players');
  await page.getByRole('button', { name: 'Add player', exact: true }).click();
  await page.getByLabel('Player name', { exact: true }).fill('New Player');
  await page.getByRole('button', { name: 'Save player' }).click();
  await expect(page.getByRole('heading', { name: 'New Player' })).toBeVisible();
  await go(page, '/settings');
  await page.getByLabel('Event name', { exact: true }).fill('Community Cup');
  await page.getByLabel('Season', { exact: true }).fill('2026 / 27');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await go(page, '/auction');
  await pauseAuto(page);
  await start(page);
  await page.getByLabel('Sale amount', { exact: true }).fill('51');
  const options = await page
    .getByLabel('Winning team', { exact: true })
    .locator('option')
    .allTextContents();
  await page
    .getByLabel('Winning team', { exact: true })
    .selectOption({ label: options.find((t) => t.startsWith('Test Club'))! });
  await page.getByRole('button', { name: 'Mark sold', exact: true }).click();
  await expect(page.locator('.sale-form').getByRole('alert')).toContainText(
    'budget',
  );
  await sell(
    page,
    '50',
    options.find((t) => t.startsWith('Test Club'))!,
  );
  await start(page);
  await page.getByLabel('Sale amount', { exact: true }).fill('1');
  await page
    .getByLabel('Winning team', { exact: true })
    .selectOption({ index: 5 });
  await page.getByRole('button', { name: 'Mark sold', exact: true }).click();
  await expect(page.locator('.sale-form').getByRole('alert')).toContainText(
    'squad',
  );
  await markUnsold(page);
  await go(page, '/settings');
  await expect(page.getByLabel('Auction unit', { exact: true })).toBeDisabled();
  await go(page, '/players');
  await expect(
    page.getByRole('button', { name: 'Add player', exact: true }),
  ).toBeDisabled();
});
test('auto-next schedules once and cancels on route exit', async ({ page }) => {
  await go(page, '/auction');
  await start(page);
  await markUnsold(page);
  await page.getByRole('link', { name: 'Teams', exact: true }).click();
  await page.waitForTimeout(2100);
  expect((await snapshot(page)).currentSelection).toBeNull();
  await page.getByRole('link', { name: 'Auction', exact: true }).click();
  await start(page);
  await markUnsold(page);
  await expect(page.getByRole('button', { name: 'Mark sold' })).toBeVisible({
    timeout: 6000,
  });
  expect((await snapshot(page)).outcomes).toHaveLength(2);
  expect((await snapshot(page)).currentSelection).not.toBeNull();
});
test('stale tab cannot overspend or duplicate saved selection', async ({
  page,
  context,
}) => {
  await go(page, '/auction');
  await pauseAuto(page);
  await start(page);
  const other = await context.newPage();
  await other.emulateMedia({ reducedMotion: 'reduce' });
  await go(other, '/auction');
  await markUnsold(page);
  await expect(
    other.getByRole('button', { name: 'Spin next player' }),
  ).toBeVisible();
  expect((await snapshot(other)).outcomes).toHaveLength(1);
  await other.close();
});
test('all screens fit narrow, tablet, desktop and short viewports; dialogs stay in viewport', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
    { width: 1280, height: 600 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of [
      '/auction',
      '/import',
      '/teams',
      '/players',
      '/unsold',
      '/results',
      '/settings',
    ]) {
      await go(page, route);
      await expect(page.locator('main')).toBeVisible();
      await noOverflow(page);
    }
    await go(page, '/auction');
    await page.screenshot({
      path: info.outputPath(`auction-${viewport.width}.png`),
      fullPage: true,
    });
    await go(page, '/teams');
    await page.getByRole('button', { name: 'Add team', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  }
  await page.setViewportSize({ width: 360, height: 640 });
  await go(page, '/auction');
  await pauseAuto(page);
  await start(page);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath('spotlight-mobile.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath('spotlight-desktop.png'),
    fullPage: true,
  });
});

test('INR precision, failed photo fallback, valid and corrupt logo uploads, keyboard dialog cancel', async ({
  page,
}) => {
  await go(page, '/settings');
  await page.getByLabel('Auction unit', { exact: true }).selectOption('INR');
  await page.getByLabel('Event logo (PNG, JPEG, WebP · 1 MB)').setInputFiles({
    name: 'bad.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not an image'),
  });
  await expect(page.locator('form').getByRole('alert')).toContainText(
    'decoded',
  );
  await page.getByLabel('Event logo (PNG, JPEG, WebP · 1 MB)').setInputFiles({
    name: 'pixel.png',
    mimeType: 'image/png',
    buffer: await page.screenshot({
      clip: { x: 0, y: 0, width: 16, height: 16 },
    }),
  });
  await expect(page.getByAltText('Event logo preview')).toBeVisible();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await go(page, '/auction');
  await pauseAuto(page);
  await start(page);
  await page.getByLabel('Sale amount', { exact: true }).fill('1.001');
  await page
    .getByLabel('Winning team', { exact: true })
    .selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Mark sold', exact: true }).click();
  await expect(page.locator('.sale-form').getByRole('alert')).toContainText(
    'two decimals',
  );
  await page.getByLabel('Sale amount', { exact: true }).fill('1250.50');
  await page.getByRole('button', { name: 'Mark sold', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('₹8,749.50');
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Sale amount', { exact: true })).toHaveValue(
    '1250.50',
  );
  await page.getByRole('button', { name: 'Mark sold', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect((await snapshot(page)).outcomes[0].amountMinor).toBe(125050);
  await page.route('https://invalid.example/**', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await go(page, '/players');
  await page.getByRole('button', { name: 'Edit profile' }).first().click();
  await page
    .getByLabel('Photo URL (optional HTTP / HTTPS)')
    .fill('https://invalid.example/photo.png');
  await page.getByRole('button', { name: 'Save player' }).click();
  await expect(
    page.locator('.player-card').first().getByLabel('Player avatar'),
  ).toBeVisible();
});

test('worksheet and title-row choice import CSV/XLSX normalized fields without replacing early', async ({
  page,
}) => {
  await go(page, '/import');
  const wb = utils.book_new();
  utils.book_append_sheet(
    wb,
    utils.aoa_to_sheet([['Notes'], ['Pick the registration tab']]),
    'Notes',
  );
  utils.book_append_sheet(
    wb,
    utils.aoa_to_sheet([
      ['Registration export'],
      [],
      ['Reg ID', 'Player Name', 'Position', 'Location', 'Secret'],
      ['X-1', 'Alex', 'Bowler', 'Kochi', 'private-extra'],
    ]),
    'Registrations',
  );
  await page.getByLabel('Registration file').setInputFiles({
    name: 'multi.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: write(wb, { type: 'buffer', bookType: 'xlsx' }),
  });
  await page.getByLabel('Worksheet', { exact: true }).selectOption('1');
  await page.getByLabel('Header row', { exact: true }).fill('3');
  await expect(
    page.getByRole('button', { name: 'Confirm import', exact: true }),
  ).toBeEnabled();
  expect((await snapshot(page)).players).toHaveLength(6);
  await page
    .getByRole('button', { name: 'Confirm import', exact: true })
    .click();
  await page.keyboard.press('Escape');
  expect((await snapshot(page)).players).toHaveLength(6);
  await page
    .getByRole('button', { name: 'Confirm import', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page).toHaveURL(/teams/);
  const s = await snapshot(page);
  expect(s.players[0]).toMatchObject({
    registrationCode: 'X-1',
    name: 'Alex',
    role: 'Bowler',
    city: 'Kochi',
    sourceRow: 4,
  });
  expect(JSON.stringify(s)).not.toContain('private-extra');
});

test('empty event setup, safe reset confirmation, direct-route refresh and sidebar preference', async ({
  page,
}) => {
  await go(page, '/auction');
  await page.getByRole('button', { name: 'Collapse teams' }).click();
  await go(page, '/settings');
  await page.getByRole('button', { name: 'New empty event' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect((await snapshot(page)).players).toHaveLength(6);
  await page.getByRole('button', { name: 'New empty event' }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Start bidding' }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Expand teams' }),
  ).toBeVisible();
  await go(page, '/teams');
  await page.getByRole('button', { name: 'Add team', exact: true }).click();
  await page.getByLabel('Team name', { exact: true }).fill('First Team');
  await page.getByRole('button', { name: 'Save team' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await go(page, '/players');
  await page.getByRole('button', { name: 'Add player', exact: true }).click();
  await page.getByLabel('Player name', { exact: true }).fill('First Player');
  await page.getByRole('button', { name: 'Save player' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'First Player' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByText('No players match this view.')).toBeVisible();
});
