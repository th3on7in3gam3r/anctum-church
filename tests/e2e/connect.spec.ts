import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import dotenv from 'dotenv';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const shots = '/tmp/sanctum-connect';
mkdirSync(shots, { recursive: true });

test.use({ viewport: { width: 1440, height: 900 } });

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${message.location().url} ${message.text()}`);
  });
  return errors;
}

async function contrast(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  const details = results.violations.flatMap((violation) =>
    violation.nodes.slice(0, 6).map((node) => `${label}: ${node.target.join(' ')} ${node.failureSummary}`)
  );
  expect(details, details.join('\n')).toEqual([]);
}

async function setTheme(page: Page, theme: 'light' | 'dusk') {
  await page.evaluate((value) => {
    localStorage.setItem('sanctum_storage_version', '3');
    localStorage.setItem('sanctum_theme', value);
    localStorage.setItem('sanctum_pastor_journey_complete', '1');
    for (const id of ['dashboard', 'controlRoom', 'listenerRoom', 'joinGate', 'createRoom']) {
      localStorage.setItem(`sanctum_tour_complete_${id}`, '1');
    }
  }, theme);
  await page.reload();
  await expect(page.locator('[data-staff]')).toHaveAttribute('data-staff-theme', theme);
  if (page.url().includes('/login')) {
    await expect(page.getByLabel('Email address')).toBeVisible();
  }
}

async function signInOwner(page: Page) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error('Clerk secret is missing');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const membership = await prisma.organizationMembership.findFirst({
      where: { role: 'OWNER', status: 'ACTIVE' },
      select: { user: { select: { clerkUserId: true } } },
    });
    const userId = membership?.user.clerkUserId;
    if (!userId) throw new Error('Owner account is missing');
    const tokenRes = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, expires_in_seconds: 120 }),
    });
    if (!tokenRes.ok) throw new Error(`Clerk sign-in token status ${tokenRes.status}`);
    const payload = (await tokenRes.json()) as { token?: string };
    if (!payload.token) throw new Error('Clerk sign-in token was empty');
    await page.goto('/login');
    await page.waitForFunction(() => Boolean((window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded));
    await page.evaluate(async (ticket) => {
      const clerk = (window as unknown as {
        Clerk: {
          client: { signIn: { create: (input: { strategy: string; ticket: string }) => Promise<{ status: string; createdSessionId: string }> } };
          setActive: (input: { session: string }) => Promise<void>;
        };
      }).Clerk;
      const attempt = await clerk.client.signIn.create({ strategy: 'ticket', ticket });
      if (attempt.status !== 'complete') throw new Error('sign-in incomplete');
      await clerk.setActive({ session: attempt.createdSessionId });
    }, payload.token);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  } finally {
    await prisma.$disconnect();
  }
}

test('church home, staff sign-in, and branded staff screens', async ({ page, request }) => {
  test.setTimeout(180_000);
  const errors = watchConsole(page);
  await page.addInitScript(() => {
    localStorage.setItem('sanctum_storage_version', '3');
    localStorage.setItem('sanctum_pastor_journey_complete', '1');
    for (const id of ['dashboard', 'controlRoom', 'listenerRoom', 'joinGate', 'createRoom']) {
      localStorage.setItem(`sanctum_tour_complete_${id}`, '1');
    }
  });

  const home = await request.get('http://localhost:3000/', { maxRedirects: 0 });
  expect(home.status()).toBe(302);
  expect(home.headers().location).toBe('http://localhost:3002');

  await page.goto('http://localhost:3002/');
  await page.getByRole('link', { name: 'Staff sign in' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Promised Land Christian Center — Staff sign in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to the website' })).toHaveAttribute('href', 'http://localhost:3002');
  await expect(page.getByText('From Biblefunland Studio')).toHaveCount(0);

  await setTheme(page, 'light');
  await contrast(page, 'login light');
  await page.screenshot({ path: path.join(shots, 'login-light.png') });
  await setTheme(page, 'dusk');
  await contrast(page, 'login dusk');
  await page.screenshot({ path: path.join(shots, 'login-dusk.png') });

  await signInOwner(page);
  await setTheme(page, 'light');
  await contrast(page, 'dashboard light');
  await page.screenshot({ path: path.join(shots, 'dashboard-light.png') });
  await setTheme(page, 'dusk');
  await contrast(page, 'dashboard dusk');

  await page.goto('/dashboard/gallery');
  await setTheme(page, 'light');
  await contrast(page, 'gallery light');
  await setTheme(page, 'dusk');
  await contrast(page, 'gallery dusk');

  const altar = await request.get('http://127.0.0.1:3000/api/altar/promised-land-christian-center');
  expect(altar.ok()).toBeTruthy();
  const body = (await altar.json()) as { room?: { id?: string } };
  expect(body.room?.id).toBeTruthy();
  await page.goto(`/dashboard/prayer-rooms/${body.room?.id}/control`);
  await setTheme(page, 'light');
  await expect(page.locator('[data-control]')).toHaveCount(1);
  await contrast(page, 'control light');
  await page.screenshot({ path: path.join(shots, 'control-light.png') });
  await setTheme(page, 'dusk');
  await contrast(page, 'control dusk');
  await page.screenshot({ path: path.join(shots, 'control-dusk.png') });

  expect(errors, errors.join('\n')).toEqual([]);
});
