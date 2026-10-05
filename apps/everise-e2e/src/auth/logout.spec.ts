import { test, expect } from '@playwright/test';

test('Successful logout', async ({ page }) => {
  await page.goto('/');

  // Sign out is in the account menu in the header.
  await page.getByTestId('loggedin-user').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();

  await expect(page.getByTestId('loggedin-user')).toBeHidden();
});
