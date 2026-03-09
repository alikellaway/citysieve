import { describe, it, expect } from 'vitest';
import nextConfig from '../../next.config';

describe('next.config.ts security headers', () => {
  it('defines a headers() function', () => {
    expect(typeof nextConfig.headers).toBe('function');
  });

  it('returns headers for all routes', async () => {
    const headerEntries = await nextConfig.headers!();

    expect(headerEntries.length).toBeGreaterThanOrEqual(1);

    const catchAll = headerEntries.find((e) => e.source === '/(.*)');
    expect(catchAll).toBeDefined();
  });

  it('includes X-Content-Type-Options: nosniff', async () => {
    const headerEntries = await nextConfig.headers!();
    const headers = headerEntries[0].headers;

    const header = headers.find((h) => h.key === 'X-Content-Type-Options');
    expect(header).toBeDefined();
    expect(header!.value).toBe('nosniff');
  });

  it('includes X-Frame-Options: DENY', async () => {
    const headerEntries = await nextConfig.headers!();
    const headers = headerEntries[0].headers;

    const header = headers.find((h) => h.key === 'X-Frame-Options');
    expect(header).toBeDefined();
    expect(header!.value).toBe('DENY');
  });

  it('includes Strict-Transport-Security with long max-age', async () => {
    const headerEntries = await nextConfig.headers!();
    const headers = headerEntries[0].headers;

    const header = headers.find((h) => h.key === 'Strict-Transport-Security');
    expect(header).toBeDefined();
    expect(header!.value).toContain('max-age=');
    expect(header!.value).toContain('includeSubDomains');
  });

  it('includes Referrer-Policy', async () => {
    const headerEntries = await nextConfig.headers!();
    const headers = headerEntries[0].headers;

    const header = headers.find((h) => h.key === 'Referrer-Policy');
    expect(header).toBeDefined();
    expect(header!.value).toBe('strict-origin-when-cross-origin');
  });

  it('includes Permissions-Policy restricting sensitive APIs', async () => {
    const headerEntries = await nextConfig.headers!();
    const headers = headerEntries[0].headers;

    const header = headers.find((h) => h.key === 'Permissions-Policy');
    expect(header).toBeDefined();
    expect(header!.value).toContain('camera=()');
    expect(header!.value).toContain('microphone=()');
    expect(header!.value).toContain('geolocation=()');
  });

  it('includes all 6 expected security headers', async () => {
    const headerEntries = await nextConfig.headers!();
    const headers = headerEntries[0].headers;

    const expectedKeys = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-DNS-Prefetch-Control',
      'Referrer-Policy',
      'Permissions-Policy',
      'Strict-Transport-Security',
    ];

    for (const key of expectedKeys) {
      const found = headers.find((h) => h.key === key);
      expect(found, `Missing header: ${key}`).toBeDefined();
    }
  });
});
