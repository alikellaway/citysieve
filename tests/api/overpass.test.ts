import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockCheck } = vi.hoisted(() => ({
  mockCheck: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/rate-limit', () => ({
  RateLimiter: class {
    check = mockCheck;
  },
}));

const { GET } = await import('@/app/api/overpass/route');

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GET /api/overpass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheck.mockReturnValue(true);
  });

  it('returns 400 if lat or lng is missing or invalid', async () => {
    const req1 = new NextRequest('http://localhost/api/overpass?lat=51.5'); // missing lng
    const res1 = await GET(req1);
    expect(res1.status).toBe(400);

    const req2 = new NextRequest('http://localhost/api/overpass?lat=abc&lng=-0.1'); // invalid lat
    const res2 = await GET(req2);
    expect(res2.status).toBe(400);
  });

  it('returns 503 if all overpass endpoints fail', async () => {
    // Mock 3 failures for the 3 endpoints
    mockFetch.mockRejectedValue(new Error('Network error'));
    
    // Silence console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = new NextRequest('http://localhost/api/overpass?lat=51.5&lng=-0.1');
    const res = await GET(req);
    
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain('Failed to fetch');

    expect(mockFetch).toHaveBeenCalledTimes(3);
    consoleSpy.mockRestore();
  });

  it('returns 503 if fetch succeeds but json parsing fails (catches the bug)', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => { throw new Error('Invalid JSON'); }
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = new NextRequest('http://localhost/api/overpass?lat=51.5&lng=-0.2'); // different coord to avoid cache
    const res = await GET(req);
    
    expect(res.status).toBe(503);
    consoleSpy.mockRestore();
  });

  it('successfully parses elements into counts', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        elements: [
          { tags: { shop: 'supermarket' } },
          { tags: { amenity: 'pub' } },
          { tags: { amenity: 'pub' } },
          { tags: { railway: 'station' } },
        ]
      })
    });

    const req = new NextRequest('http://localhost/api/overpass?lat=51.5&lng=-0.3');
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.supermarkets).toBe(1);
    expect(data.highStreet).toBe(1); // shop=supermarket also counts as highStreet
    expect(data.pubsBars).toBe(2);
    expect(data.trainStation).toBe(1);
    expect(data.schools).toBe(0); // Check missing category is 0
  });

  it('uses cache for identical requests', async () => {
    const mockResponse = { elements: [{ tags: { leisure: 'park' } }] };
    mockFetch.mockResolvedValueOnce({
      json: async () => mockResponse
    });

    const req1 = new NextRequest('http://localhost/api/overpass?lat=51.5&lng=-0.4');
    await GET(req1);

    const req2 = new NextRequest('http://localhost/api/overpass?lat=51.5&lng=-0.4');
    const res2 = await GET(req2);
    
    expect(res2.status).toBe(200);
    const data = await res2.json();
    expect(data.parksGreenSpaces).toBe(1);
    
    expect(mockFetch).toHaveBeenCalledTimes(1); // only 1 fetch, second was cached
  });

  it('returns 429 if rate limit is exceeded', async () => {
    mockCheck.mockReturnValue(false);

    const req = new NextRequest('http://localhost/api/overpass?lat=51.5&lng=-0.5');
    const res = await GET(req);

    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain('Too many requests');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
