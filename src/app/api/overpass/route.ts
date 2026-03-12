import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limit';
import { fetchOverpassMetrics } from '@/lib/data/metrics';

const limiter = new RateLimiter({ maxRequests: 30, windowMs: 60_000 });
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function roundCoord(n: number): number {
  return Math.round(n * 200) / 200; // ~500m precision
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!limiter.check(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const lat = parseFloat(request.nextUrl.searchParams.get('lat') || '');
  const lng = parseFloat(request.nextUrl.searchParams.get('lng') || '');
  
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const rlat = roundCoord(lat);
  const rlng = roundCoord(lng);
  const cacheKey = `overpass:${rlat}:${rlng}:poly`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const counts = await fetchOverpassMetrics(lat, lng);
    cache.set(cacheKey, { data: counts, timestamp: Date.now() });
    return NextResponse.json(counts);
  } catch (error) {
    console.error('Overpass fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Overpass data. Please try again later.' },
      { status: 503 }
    );
  }
}