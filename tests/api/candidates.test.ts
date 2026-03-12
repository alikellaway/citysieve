import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../src/app/api/candidates/route';
import { prisma } from '../../src/lib/db';

vi.mock('../../src/lib/db', () => ({
  prisma: {
    areaCentroid: {
      findMany: vi.fn(),
    },
  },
}));

describe('GET /api/candidates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns candidate areas with metrics when available', async () => {
    const mockCandidates = [
      {
        id: '1',
        name: 'Test Area',
        outcode: 'TE1',
        lat: 51.5,
        lng: -0.1,
        metrics: {
          supermarkets: 1,
          highStreet: 2,
        }
      }
    ];

    vi.mocked(prisma.areaCentroid.findMany).mockResolvedValueOnce(mockCandidates as any);

    const req = new NextRequest('http://localhost:3000/api/candidates?lat=51.5&lng=-0.1&radius=5');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.length).toBe(1);
    expect(json[0].outcode).toBe('TE1');
    expect(json[0].metrics).toEqual({ supermarkets: 1, highStreet: 2 });
    
    // Should have called findMany with include: { metrics: ... }
    expect(prisma.areaCentroid.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.areaCentroid.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          metrics: expect.any(Object)
        })
      })
    );
  });

  it('falls back to fetching without metrics if the initial query throws', async () => {
    const mockCandidates = [
      {
        id: '1',
        name: 'Test Area',
        outcode: 'TE1',
        lat: 51.5,
        lng: -0.1,
      }
    ];

    // First call throws (e.g. table not found)
    vi.mocked(prisma.areaCentroid.findMany)
      .mockRejectedValueOnce(new Error('Table CandidateMetrics does not exist'))
      // Second call succeeds
      .mockResolvedValueOnce(mockCandidates as any);

    const req = new NextRequest('http://localhost:3000/api/candidates?lat=51.5&lng=-0.1&radius=5');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.length).toBe(1);
    expect(json[0].outcode).toBe('TE1');
    expect(json[0].metrics).toBeNull();
    
    // Should have called findMany twice
    expect(prisma.areaCentroid.findMany).toHaveBeenCalledTimes(2);
    
    // Second call should NOT have the include: { metrics: ... } block
    expect(prisma.areaCentroid.findMany).toHaveBeenNthCalledWith(2, 
      expect.not.objectContaining({
        include: expect.any(Object)
      })
    );
  });

  it('filters candidates accurately using haversine distance', async () => {
    const mockCandidates = [
      {
        id: '1',
        name: 'Close Area',
        outcode: 'C1',
        lat: 51.5,
        lng: -0.1, // Distance 0km
      },
      {
        id: '2',
        name: 'Far Area',
        outcode: 'F1',
        lat: 52.5,
        lng: -1.0, // Distance > 100km
      }
    ];

    vi.mocked(prisma.areaCentroid.findMany).mockResolvedValueOnce(mockCandidates as any);

    // 10km radius
    const req = new NextRequest('http://localhost:3000/api/candidates?lat=51.5&lng=-0.1&radius=10');
    const res = await GET(req);
    const json = await res.json();

    expect(json.length).toBe(1);
    expect(json[0].outcode).toBe('C1');
  });

  it('returns 400 for invalid coordinates', async () => {
    const req = new NextRequest('http://localhost:3000/api/candidates?lat=invalid&lng=-0.1');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid coordinates');
  });

  it('returns 400 for missing coordinates', async () => {
    const req = new NextRequest('http://localhost:3000/api/candidates?lat=&lng=');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid coordinates');
  });

  it('returns 500 with detail when both queries fail (e.g. database inaccessible)', async () => {
    // Both calls throw — simulates a missing or corrupt database
    vi.mocked(prisma.areaCentroid.findMany)
      .mockRejectedValueOnce(new Error('SQLITE_CANTOPEN: unable to open database file'))
      .mockRejectedValueOnce(new Error('SQLITE_CANTOPEN: unable to open database file'));

    const req = new NextRequest('http://localhost:3000/api/candidates?lat=51.5&lng=-0.1&radius=5');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Database query failed');
    expect(json.detail).toContain('SQLITE_CANTOPEN');
  });

  it('returns empty array when no candidates match the area', async () => {
    vi.mocked(prisma.areaCentroid.findMany).mockResolvedValueOnce([]);

    const req = new NextRequest('http://localhost:3000/api/candidates?lat=0&lng=0&radius=5');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });
});