import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/geocode/route';
import { NextRequest } from 'next/server';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GET /api/geocode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 if q is missing', async () => {
    const req = new NextRequest('http://localhost/api/geocode');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('fetches from nominatim and returns data', async () => {
    const mockData = [{ display_name: 'Test City', lat: '50', lon: '-1' }];
    mockFetch.mockResolvedValueOnce({
      json: async () => mockData,
    });

    const req = new NextRequest('http://localhost/api/geocode?q=test');
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(mockData);
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(fetchUrl.searchParams.get('q')).toBe('test');
  });

  it('uses cache for subsequent identical requests', async () => {
    const mockData = [{ display_name: 'Cached City', lat: '50', lon: '-1' }];
    mockFetch.mockResolvedValueOnce({
      json: async () => mockData,
    });

    // First request
    const req1 = new NextRequest('http://localhost/api/geocode?q=cached');
    await GET(req1);

    // Second request
    const req2 = new NextRequest('http://localhost/api/geocode?q=cached');
    const res2 = await GET(req2);
    
    const data = await res2.json();
    expect(data).toEqual(mockData);
    
    // Fetch should only be called once due to cache
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
