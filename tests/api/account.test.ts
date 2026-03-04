import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/account/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

describe('/api/account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 if unauthorized', async () => {
      (auth as any).mockResolvedValueOnce(null);
      const req = new NextRequest('http://localhost/api/account');
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('returns 404 if user not found', async () => {
      (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
      (prisma.user.findUnique as any).mockResolvedValueOnce(null);
      const res = await GET();
      expect(res.status).toBe(404);
    });

    it('returns 200 with emailOptIn if found', async () => {
      (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
      (prisma.user.findUnique as any).mockResolvedValueOnce({ emailOptIn: true });
      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.emailOptIn).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        select: { emailOptIn: true },
      });
    });
  });

  describe('PATCH', () => {
    it('returns 401 if unauthorized', async () => {
      (auth as any).mockResolvedValueOnce(null);
      const req = new NextRequest('http://localhost/api/account', {
        method: 'PATCH',
        body: JSON.stringify({ emailOptIn: true }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 if emailOptIn is not boolean', async () => {
      (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
      const req = new NextRequest('http://localhost/api/account', {
        method: 'PATCH',
        body: JSON.stringify({ emailOptIn: 'yes' }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(400);
    });

    it('updates emailOptIn and returns 200', async () => {
      (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
      (prisma.user.update as any).mockResolvedValueOnce({});
      const req = new NextRequest('http://localhost/api/account', {
        method: 'PATCH',
        body: JSON.stringify({ emailOptIn: false }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { emailOptIn: false },
      });
    });
  });

  describe('DELETE', () => {
    it('returns 401 if unauthorized', async () => {
      (auth as any).mockResolvedValueOnce(null);
      const res = await DELETE();
      expect(res.status).toBe(401);
    });

    it('deletes user and returns 200', async () => {
      (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
      (prisma.user.delete as any).mockResolvedValueOnce({});
      const res = await DELETE();
      expect(res.status).toBe(200);
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user_1' },
      });
    });
  });
});
