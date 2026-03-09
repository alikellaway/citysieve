import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

/** Reject payloads whose JSON-serialised survey state exceeds this byte limit. */
const MAX_STATE_BYTES = 64 * 1024; // 64 KB
const MAX_TOP_RESULTS = 50;

const topResultSchema = z.object({
  name: z.string().max(200),
  outcode: z.string().max(10).optional(),
  score: z.number(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  highlights: z.array(z.string().max(200)).max(20),
  commuteEstimate: z.number().optional(),
});

const analyticsSchema = z.object({
  surveyMode: z.enum(['full', 'quick']).nullable(),
  surveyState: z.record(z.unknown()),
  topResults: z.array(topResultSchema).max(MAX_TOP_RESULTS),
  totalCandidates: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
  passedCount: z.number().int().nonnegative(),
  radiusKm: z.number().nonnegative(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = analyticsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const {
      surveyMode,
      surveyState,
      topResults,
      totalCandidates,
      rejectedCount,
      passedCount,
      radiusKm,
    } = result.data;

    // Guard against oversized state blobs before any processing
    const stateStr = JSON.stringify(surveyState);
    if (stateStr.length > MAX_STATE_BYTES) {
      return NextResponse.json({ error: 'Survey state too large' }, { status: 413 });
    }

    // Optional: try to get user id, but don't fail if anonymous
    const session = await auth();
    const userId = session?.user?.id || null;

    // Sanitize survey state (remove location labels to protect privacy)
    const sanitizedState = JSON.parse(stateStr);
    if (sanitizedState?.commute?.workLocation) {
      delete sanitizedState.commute.workLocation.label;
      // Round coordinates to ~100m precision
      sanitizedState.commute.workLocation.lat = Math.round(sanitizedState.commute.workLocation.lat * 1000) / 1000;
      sanitizedState.commute.workLocation.lng = Math.round(sanitizedState.commute.workLocation.lng * 1000) / 1000;
    }
    if (sanitizedState?.family?.familyLocation) {
      delete sanitizedState.family.familyLocation.label;
      sanitizedState.family.familyLocation.lat = Math.round(sanitizedState.family.familyLocation.lat * 1000) / 1000;
      sanitizedState.family.familyLocation.lng = Math.round(sanitizedState.family.familyLocation.lng * 1000) / 1000;
    }

    // Sanitize results (round coordinates)
    const sanitizedResults = topResults.map(r => ({
      ...r,
      coordinates: {
        lat: Math.round(r.coordinates.lat * 1000) / 1000,
        lng: Math.round(r.coordinates.lng * 1000) / 1000,
      }
    }));

    await prisma.surveyAnalytics.create({
      data: {
        userId,
        surveyMode,
        surveyState: JSON.stringify(sanitizedState),
        topResults: JSON.stringify(sanitizedResults),
        totalCandidates,
        rejectedCount,
        passedCount,
        radiusKm,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save survey analytics:', error);
    // Always return 200 to avoid cluttering client console, this is fire-and-forget
    return NextResponse.json({ success: false });
  }
}
