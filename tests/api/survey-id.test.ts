import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from '@/app/api/survey/[id]/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    savedSurvey: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

describe('GET /api/survey/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if unauthorized', async () => {
    (auth as any).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/survey/123');
    const res = await GET(req, { params: Promise.resolve({ id: '123' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 if survey not found or not owned', async () => {
    (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
    (prisma.savedSurvey.findFirst as any).mockResolvedValueOnce(null);
    
    const req = new NextRequest('http://localhost/api/survey/123');
    const res = await GET(req, { params: Promise.resolve({ id: '123' }) });
    expect(res.status).toBe(404);
  });

  it('returns survey with parsed state', async () => {
    (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
    const mockState = { currentStep: 2 };
    (prisma.savedSurvey.findFirst as any).mockResolvedValueOnce({
      id: '123',
      userId: 'user_1',
      state: JSON.stringify(mockState),
    });
    
    const req = new NextRequest('http://localhost/api/survey/123');
    const res = await GET(req, { params: Promise.resolve({ id: '123' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.id).toBe('123');
    expect(data.state).toEqual(mockState);
  });
});

describe('DELETE /api/survey/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if unauthorized', async () => {
    (auth as any).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/survey/123', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '123' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 if survey not found', async () => {
    (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
    (prisma.savedSurvey.findFirst as any).mockResolvedValueOnce(null);
    
    const req = new NextRequest('http://localhost/api/survey/123', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '123' }) });
    expect(res.status).toBe(404);
  });

  it('deletes survey if found and owned', async () => {
    (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
    (prisma.savedSurvey.findFirst as any).mockResolvedValueOnce({ id: '123' });
    (prisma.savedSurvey.delete as any).mockResolvedValueOnce({ id: '123' });

    const req = new NextRequest('http://localhost/api/survey/123', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '123' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    
    expect(prisma.savedSurvey.delete).toHaveBeenCalledWith({ where: { id: '123' } });
  });
});
