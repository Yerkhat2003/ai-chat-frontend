import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test('superadmin/admin can open admin studio', async ({ page }) => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Provide E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD',
  );

  await page.goto('/auth/login');
  await page.getByPlaceholder('Email').fill(ADMIN_EMAIL!);
  await page.getByPlaceholder('Password').fill(ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole('button', { name: /admin studio/i }).click();
  await expect(page).toHaveURL(/\/admin/);
  await expect(
    page.getByRole('heading', { name: /admin command center/i }),
  ).toBeVisible();
});
