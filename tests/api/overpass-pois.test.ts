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

const { GET } = await import('@/app/api/overpass/pois/route');

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GET /api/overpass/pois', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheck.mockReturnValue(true);
  });

  it('returns 400 if lat or lng is missing', async () => {
    const req = new NextRequest('http://localhost/api/overpass/pois?lat=abc');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('categorizes and labels elements correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        elements: [
          { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { shop: 'supermarket', name: 'Tesco' } },
          { type: 'node', id: 2, lat: 51.51, lon: -0.11, tags: { amenity: 'pub' } }, // no name, falls back to type label
          { type: 'way', id: 3, tags: { shop: 'supermarket' } }, // not a node
          { type: 'node', id: 4, lat: 51.52, lon: -0.12, tags: { unknown: 'tag' } }, // unknown category
        ]
      })
    });

    const req = new NextRequest('http://localhost/api/overpass/pois?lat=51.5&lng=-0.1');
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.length).toBe(2);
    
    expect(data[0]).toEqual({
      id: 1,
      lat: 51.5,
      lng: -0.1,
      name: 'Tesco',
      type: 'Supermarket',
      category: 'supermarkets',
    });

    expect(data[1]).toEqual({
      id: 2,
      lat: 51.51,
      lng: -0.11,
      name: 'Pub',
      type: 'Pub',
      category: 'pubsBars',
    });
  });

  it('uses cache for identical requests', async () => {
    const mockResponse = { elements: [] };
    mockFetch.mockResolvedValueOnce({
      json: async () => mockResponse
    });

    const req1 = new NextRequest('http://localhost/api/overpass/pois?lat=51.5&lng=-0.2');
    await GET(req1);

    const req2 = new NextRequest('http://localhost/api/overpass/pois?lat=51.5&lng=-0.2');
    const res2 = await GET(req2);
    
    expect(res2.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1); // second request hits cache
  });

  it('returns 429 if rate limit is exceeded', async () => {
    mockCheck.mockReturnValue(false);

    const req = new NextRequest('http://localhost/api/overpass/pois?lat=51.5&lng=-0.3');
    const res = await GET(req);

    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain('Too many requests');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
