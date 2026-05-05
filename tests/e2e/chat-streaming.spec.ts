import { expect, test } from '@playwright/test';

const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;

test('chat streaming renders assistant bubble', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'Provide E2E_USER_EMAIL and E2E_USER_PASSWORD');

  await page.goto('/auth/login');
  await page.getByPlaceholder('Email').fill(EMAIL!);
  await page.getByPlaceholder('Password').fill(PASSWORD!);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard|\/chat\//);

  await page.goto('/');
  const composer = page.getByPlaceholder('Send a message to start a new chat');
  await composer.fill('E2E stream smoke test');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/chat\//, { timeout: 30_000 });
  await expect(
    page.locator('text=Assistant response').first(),
  ).toBeVisible({ timeout: 30_000 });
});
