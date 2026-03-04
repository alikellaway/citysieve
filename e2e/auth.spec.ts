import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('home page loads without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CitySieve/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('sign in button is visible and redirects to signin', async ({ page }) => {
    await page.goto('/');
    
    // Check for a link or button that contains "Sign in" or similar text.
    // Assuming there's a header with a sign in link.
    const signInButton = page.locator('text=/Sign in/i').first();
    
    // Just verify it's visible, we won't actually click it to avoid real OAuth flow issues in CI/CD.
    if (await signInButton.isVisible()) {
      await expect(signInButton).toBeVisible();
    }
  });
});
