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

  it('returns 400 if state is a string (not an object)', async () => {
    (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
    const req = new NextRequest('http://localhost/api/survey/save', {
      method: 'POST',
      body: JSON.stringify({ state: 'not-an-object' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('accepts arrays as state (typeof array === "object")', async () => {
    (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
    (prisma.savedSurvey.create as any).mockResolvedValueOnce({ id: 'survey_arr' });
    const req = new NextRequest('http://localhost/api/survey/save', {
      method: 'POST',
      body: JSON.stringify({ state: [1, 2, 3] }),
    });
    const res = await POST(req);
    // Arrays pass typeof === 'object', so they are accepted.
    // The security fix targets primitives (strings, numbers, booleans).
    expect(res.status).toBe(200);
  });

  it('returns 413 if survey state exceeds 64KB', async () => {
    (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
    // Create an object whose JSON is larger than 64KB
    const bigState = { data: 'x'.repeat(70 * 1024) };
    const req = new NextRequest('http://localhost/api/survey/save', {
      method: 'POST',
      body: JSON.stringify({ state: bigState, label: 'Big' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.error).toContain('too large');
  });

  it('truncates label to 200 characters', async () => {
    (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
    (prisma.savedSurvey.create as any).mockResolvedValueOnce({ id: 'survey_456' });

    const longLabel = 'A'.repeat(300);
    const req = new NextRequest('http://localhost/api/survey/save', {
      method: 'POST',
      body: JSON.stringify({ state: { step: 1 }, label: longLabel }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const callArgs = (prisma.savedSurvey.create as any).mock.calls[0][0].data;
    expect(callArgs.label.length).toBe(200);
  });

  it('uses default label when label is not a string', async () => {
    (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
    (prisma.savedSurvey.create as any).mockResolvedValueOnce({ id: 'survey_789' });

    const req = new NextRequest('http://localhost/api/survey/save', {
      method: 'POST',
      body: JSON.stringify({ state: { step: 1 }, label: 12345 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const callArgs = (prisma.savedSurvey.create as any).mock.calls[0][0].data;
    expect(callArgs.label).toBe('Untitled Survey');
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
