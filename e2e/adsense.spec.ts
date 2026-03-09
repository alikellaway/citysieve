import { test, expect } from '@playwright/test';

test.describe('Google AdSense Verification', () => {
  test('homepage has google-adsense-account meta tag', async ({ page }) => {
    await page.goto('/');
    
    // Check for the meta tag in the head
    const metaTag = page.locator('meta[name="google-adsense-account"]');
    await expect(metaTag).toHaveAttribute('content', 'ca-pub-1815955226233160');
  });

  test('ads.txt is served correctly', async ({ request }) => {
    const response = await request.get('/ads.txt');
    
    // Check that it responds with 200 OK
    expect(response.ok()).toBeTruthy();
    
    // Check that the content contains the required string
    const text = await response.text();
    expect(text).toContain('google.com, pub-1815955226233160, DIRECT, f08c47fec0942fa0');
  });
});
