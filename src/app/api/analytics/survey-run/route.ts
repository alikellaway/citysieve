import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

const topResultSchema = z.object({
  name: z.string(),
  outcode: z.string().optional(),
  score: z.number(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  highlights: z.array(z.string()),
  commuteEstimate: z.number().optional(),
});

const analyticsSchema = z.object({
  surveyMode: z.enum(['full', 'quick']).nullable(),
  surveyState: z.any(),
  topResults: z.array(topResultSchema),
  totalCandidates: z.number(),
  rejectedCount: z.number(),
  passedCount: z.number(),
  radiusKm: z.number(),
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

    // Optional: try to get user id, but don't fail if anonymous
    const session = await auth();
    const userId = session?.user?.id || null;

    // Sanitize survey state (remove location labels to protect privacy)
    const sanitizedState = JSON.parse(JSON.stringify(surveyState));
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
