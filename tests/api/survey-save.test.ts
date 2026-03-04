import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/survey/save/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    savedSurvey: {
      create: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

describe('POST /api/survey/save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if unauthorized', async () => {
    (auth as any).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/survey/save', {
      method: 'POST',
      body: JSON.stringify({ state: {} }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 if state is missing', async () => {
    (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
    const req = new NextRequest('http://localhost/api/survey/save', {
      method: 'POST',
      body: JSON.stringify({ label: 'My Survey' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('creates a survey and returns id', async () => {
    (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
    (prisma.savedSurvey.create as any).mockResolvedValueOnce({ id: 'survey_123' });

    const surveyState = { currentStep: 2 };
    const req = new NextRequest('http://localhost/api/survey/save', {
      method: 'POST',
      body: JSON.stringify({ state: surveyState, label: 'Test Label' }),
    });
    
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('survey_123');
    
    expect(prisma.savedSurvey.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        label: 'Test Label',
        state: JSON.stringify(surveyState),
      },
    });
  });
});
