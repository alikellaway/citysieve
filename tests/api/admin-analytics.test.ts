import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/admin/analytics/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    surveyAnalytics: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';

describe('GET /api/admin/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANALYTICS_API_KEY = 'test-secret-key';
  });

  it('returns 401 if unauthorized (no header)', async () => {
    const req = new NextRequest('http://localhost/api/admin/analytics');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 if unauthorized (wrong key)', async () => {
    const req = new NextRequest('http://localhost/api/admin/analytics', {
      headers: { Authorization: 'Bearer wrong-key' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 if API key env var is not set', async () => {
    delete process.env.ANALYTICS_API_KEY;
    const req = new NextRequest('http://localhost/api/admin/analytics', {
      headers: { Authorization: 'Bearer test-secret-key' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns parsed analytics data if authorized', async () => {
    const mockRows = [
      {
        id: 1,
        createdAt: new Date(),
        surveyState: JSON.stringify({ currentStep: 1 }),
        topResults: JSON.stringify([{ id: 'area_1', score: 100 }]),
      }
    ];
    (prisma.surveyAnalytics.findMany as any).mockResolvedValueOnce(mockRows);

    const req = new NextRequest('http://localhost/api/admin/analytics?limit=10&offset=5', {
      headers: { Authorization: 'Bearer test-secret-key' },
    });
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.count).toBe(1);
    expect(data.offset).toBe(5);
    expect(data.limit).toBe(10);
    expect(data.rows[0].surveyState).toEqual({ currentStep: 1 }); // Parsed JSON
    expect(data.rows[0].topResults[0].score).toBe(100);

    expect(prisma.surveyAnalytics.findMany).toHaveBeenCalledWith({
      take: 10,
      skip: 5,
      orderBy: { createdAt: 'desc' },
      where: undefined,
    });
  });

  it('limits to 1000 and parses since date', async () => {
    (prisma.surveyAnalytics.findMany as any).mockResolvedValueOnce([]);
    
    const req = new NextRequest('http://localhost/api/admin/analytics?limit=5000&since=2026-01-01', {
      headers: { Authorization: 'Bearer test-secret-key' },
    });
    await GET(req);
    
    expect(prisma.surveyAnalytics.findMany).toHaveBeenCalledWith({
      take: 1000,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      where: { createdAt: { gte: new Date('2026-01-01') } },
    });
  });
});
