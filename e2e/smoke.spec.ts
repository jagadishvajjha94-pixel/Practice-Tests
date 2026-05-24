import { test, expect } from '@playwright/test';

const gotoOpts = { waitUntil: 'domcontentloaded' as const };

test.describe('Public portal smoke', () => {
  test('landing page loads and links to sign in', async ({ page }) => {
    await page.goto('/', gotoOpts);
    await expect(page.getByRole('link', { name: /sign in to portal/i })).toBeVisible();
  });

  test('role selection shows student and admin entry points', async ({ page }) => {
    await page.goto('/auth/role', gotoOpts);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /student login/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /admin login/i })).toBeVisible();
  });

  test('student login page renders credential form', async ({ page }) => {
    await page.goto('/auth/login/student', gotoOpts);
    await expect(page.getByRole('heading', { name: /student sign in/i })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('placement route guards unauthenticated access', async ({ page }) => {
    await page.goto('/placement', gotoOpts);
    await expect(page).toHaveURL(/\/auth\/(role|login)/);
  });
});
