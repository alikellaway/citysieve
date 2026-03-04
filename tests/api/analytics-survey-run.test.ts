import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/analytics/survey-run/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    surveyAnalytics: {
      create: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

describe('POST /api/analytics/survey-run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validPayload = {
    surveyMode: 'full',
    surveyState: { 
      commute: { workLocation: { label: 'Office', lat: 51.5005, lng: -0.1005 } },
      family: { familyLocation: { label: 'Home', lat: 53.4805, lng: -2.2405 } }
    },
    topResults: [
      { name: 'London', score: 95, coordinates: { lat: 51.5, lng: -0.1 }, highlights: [] }
    ],
    totalCandidates: 50,
    rejectedCount: 10,
    passedCount: 40,
    radiusKm: 10,
  };

  it('returns 400 for invalid payload', async () => {
    const req = new NextRequest('http://localhost/api/analytics/survey-run', {
      method: 'POST',
      body: JSON.stringify({ surveyMode: 'invalid' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('sanitizes state and results before saving', async () => {
    (auth as any).mockResolvedValueOnce(null); // anonymous user
    (prisma.surveyAnalytics.create as any).mockResolvedValueOnce({});

    const req = new NextRequest('http://localhost/api/analytics/survey-run', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const callArgs = (prisma.surveyAnalytics.create as any).mock.calls[0][0].data;
    
    expect(callArgs.userId).toBeNull();
    
    // Check state sanitization
    const savedState = JSON.parse(callArgs.surveyState);
    expect(savedState.commute.workLocation.label).toBeUndefined(); // label removed
    expect(savedState.commute.workLocation.lat).toBe(51.501); // rounded to 3dp
    expect(savedState.family.familyLocation.label).toBeUndefined();
    expect(savedState.family.familyLocation.lat).toBe(53.481); // rounded to 3dp

    // Check result sanitization
    const savedResults = JSON.parse(callArgs.topResults);
    expect(savedResults[0].coordinates.lat).toBe(51.5);
  });

  it('returns 200 {success: false} if DB throws (fire and forget)', async () => {
    (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
    (prisma.surveyAnalytics.create as any).mockRejectedValueOnce(new Error('DB connection failed'));
    
    // Silence console error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = new NextRequest('http://localhost/api/analytics/survey-run', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(false);
    
    consoleSpy.mockRestore();
  });
});
