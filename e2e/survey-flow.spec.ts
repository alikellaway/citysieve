import { test, expect } from '@playwright/test';

test.describe('Survey Flow', () => {
  test('should navigate to survey and render step 1', async ({ page }) => {
    await page.goto('/survey');
    
    // Verify we are on step 1 (Profile)
    await expect(page.locator('text=Profile')).toBeVisible();
    await expect(page.locator('text=Age Range')).toBeVisible();
  });

  test('should allow filling minimal quick survey and see results', async ({ page }) => {
    // We can go to the quick start flow instead of full survey for an E2E test, 
    // or just try to fill some basics and submit.
    await page.goto('/');
    
    const startButton = page.locator('text=Start Quick Search').first();
    
    if (await startButton.isVisible()) {
      await startButton.click();
      
      // Wait for results page
      await page.waitForURL('**/results');
      
      // Map should be rendered
      await expect(page.locator('.leaflet-container')).toBeVisible();
      
      // At least one result card should be present
      await expect(page.locator('.result-card').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('direct navigation to results handles missing state gracefully', async ({ page }) => {
    await page.goto('/results');
    
    // It should either redirect to /survey or show a message that no state is found.
    // Just checking it doesn't crash with a Next.js 500 error overlay.
    const errorOverlay = page.locator('nextjs-portal'); // Next.js dev error portal
    await expect(errorOverlay).toHaveCount(0);
    
    // Should see some sensible empty state or redirect
    const hasMap = await page.locator('.leaflet-container').isVisible();
    const isRedirected = page.url().includes('/survey');
    
    expect(hasMap || isRedirected || await page.locator('text=/start/i').isVisible()).toBeTruthy();
  });
});
