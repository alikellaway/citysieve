import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/survey/list/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    savedSurvey: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

describe('GET /api/survey/list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if unauthorized', async () => {
    (auth as any).mockResolvedValueOnce(null);
    const res = await GET() as any;
    expect(res.status).toBe(401);
  });

  it('returns list of surveys for authenticated user', async () => {
    (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
    const mockSurveys = [
      { id: '1', label: 'Survey 1', createdAt: new Date() },
      { id: '2', label: 'Survey 2', createdAt: new Date() },
    ];
    (prisma.savedSurvey.findMany as any).mockResolvedValueOnce(mockSurveys);

    const res = await GET() as any;
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    // We compare strings because dates are serialized
    expect(data.length).toBe(2);
    expect(data[0].id).toBe('1');
    expect(data[0].label).toBe('Survey 1');
    
    expect(prisma.savedSurvey.findMany).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      select: {
        id: true,
        label: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  });
});
