import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 200;

function isAuthorized(request: NextRequest): boolean {
  const apiKey = process.env.ANALYTICS_API_KEY;
  if (!apiKey) return false;

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  return authHeader.slice(7) === apiKey;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT)), MAX_LIMIT);
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const since = searchParams.get('since'); // ISO date string, e.g. 2026-01-01

  const rows = await prisma.surveyAnalytics.findMany({
    take: limit,
    skip: offset,
    orderBy: { createdAt: 'desc' },
    where: since
      ? { createdAt: { gte: new Date(since) } }
      : undefined,
  });

  // Parse JSON blobs so the consumer gets proper objects, not strings
  const parsed = rows.map((row) => ({
    ...row,
    surveyState: JSON.parse(row.surveyState),
    topResults: JSON.parse(row.topResults),
  }));

  return NextResponse.json({
    count: parsed.length,
    offset,
    limit,
    rows: parsed,
  });
}
