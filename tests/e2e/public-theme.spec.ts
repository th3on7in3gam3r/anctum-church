import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const slug = process.env.PRAYER_ROOM_SLUG || 'promised-land-christian-center';
const outDir = process.env.THEME_SHOTS || '/tmp/sanctum-theme';
const summary: Record<string, { count: number; detail: string }> = {};
const failures: string[] = [];

async function checkContrast(page: import('@playwright/test').Page, pageName: string, theme: string) {
  const results = await new AxeBuilder({ page })
    .include('.sanctum-screen')
    .withRules(['color-contrast'])
    .analyze();
  const detail = results.violations.length
    ? results.violations
        .map((item) => {
          const sample = item.nodes.slice(0, 3).map((node) => node.html).join(' | ');
          return `${item.nodes.length} node(s): ${sample}`;
        })
        .join('\n')
    : 'no color-contrast violations';
  summary[`${pageName} / ${theme}`] = { count: results.violations.reduce((sum, item) => sum + item.nodes.length, 0), detail };
  if (results.violations.length) failures.push(`${pageName} / ${theme}\n${detail}`);
}

async function dismissToasts(page: import('@playwright/test').Page) {
  const closes = page.getByRole('button', { name: /dismiss|close/i });
  const count = await closes.count();
  for (let index = 0; index < count; index += 1) {
    const button = closes.nth(index);
    if (await button.isVisible().catch(() => false)) await button.click().catch(() => undefined);
  }
}

async function shot(page: import('@playwright/test').Page, name: string) {
  await dismissToasts(page);
  mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sanctum_storage_version', '3');
    localStorage.setItem('sanctum_tour_complete_joinGate', '1');
    localStorage.setItem('sanctum_tour_complete_listenerRoom', '1');
  });
});

test('join and listener rooms pass contrast in dusk and light', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sanctum_theme', 'dusk');
  });
  await page.goto(`/join/${slug}`);
  await expect(page.locator('.sanctum-screen')).toHaveAttribute('data-theme', 'dusk');
  await expect(page.getByRole('button', { name: 'Enter the sanctuary' })).toBeVisible();
  await expect(page.getByText('Sermon leader:')).toBeVisible();
  await shot(page, 'join-dusk');
  await checkContrast(page, 'join', 'dusk');

  await page.locator('#attendeeName').fill('Theme Contrast');
  await page.getByRole('button', { name: 'Enter the sanctuary' }).click();
  await expect(page.getByRole('button', { name: 'Leave prayer session' })).toBeVisible();
  await expect(page.getByText('Gathering chat')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Promised Land Christian Center' })).toBeVisible();
  await expect(page.getByText('Sermon leader: Pastor GraceLove Hiire')).toBeVisible();
  await expect(page.getByText('Waiting for the next prayer leader.')).toBeVisible();
  await expect(page.getByText('Waiting', { exact: true })).toBeVisible();
  await expect(page.getByText('until the pastor opens the floor for prayer')).toBeVisible();
  await expect(page.getByText('the sermon leader')).toHaveCount(0);
  await expect(page.getByText('Morning Prayer')).toHaveCount(0);
  await expect(page.getByText(/PTT/)).toHaveCount(0);
  await expect(
    page.locator('.sanctum-chip').filter({ hasText: /Mic (locked|offline|ready)|Your mic is live/ })
  ).toHaveCount(1);
  const raiseHand = page.getByRole('button', { name: 'Raise Hand' });
  await expect(raiseHand).toHaveClass(/sanctum-raise/);
  const raiseBorder = await raiseHand.evaluate((el) => {
    const view = el.ownerDocument.defaultView;
    if (!view) return '';
    const declared: string[] = [];
    const visit = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if (
          rule instanceof view.CSSStyleRule &&
          rule.selectorText.includes('.sanctum-raise') &&
          !rule.selectorText.includes(':') &&
          rule.cssText.includes('1.5px')
        ) {
          declared.push('1.5px');
        } else if (rule instanceof view.CSSGroupingRule) {
          visit(rule.cssRules);
        }
      }
    };
    for (const sheet of view.document.styleSheets) {
      try {
        visit(sheet.cssRules);
      } catch {
        /* Cross-origin sheets are skipped. */
      }
    }
    return declared.join(' ');
  });
  expect(raiseBorder).toBe('1.5px');
  await expect(page.locator('.sanctum-screen')).toHaveAttribute('data-theme', 'dusk');
  await shot(page, 'listener-dusk');
  await checkContrast(page, 'listener', 'dusk');

  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('.sanctum-screen')).toHaveAttribute('data-theme', 'light');
  await shot(page, 'listener-light');
  await checkContrast(page, 'listener', 'light');

  await page.getByRole('button', { name: 'Leave prayer session' }).click();
  await expect(page.getByRole('button', { name: 'Enter the sanctuary' })).toBeVisible();
  await expect(page.getByText('Sermon leader:')).toBeVisible();
  await expect(page.locator('.sanctum-screen')).toHaveAttribute('data-theme', 'light');
  await shot(page, 'join-light');
  await checkContrast(page, 'join', 'light');

  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/axe-summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  expect(failures, failures.join('\n\n')).toEqual([]);
});

test('a first visit with no saved theme loads dusk', async ({ page }) => {
  await page.goto(`/join/${slug}`);
  await expect(page.locator('.sanctum-screen')).toHaveAttribute('data-theme', 'dusk');
  await expect(page.getByText('Sermon leader:')).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem('sanctum_theme'));
  expect(saved).toBe('dusk');
});
