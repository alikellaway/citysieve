import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limit';
import { fetchTransitMetrics } from '@/lib/data/metrics';

const limiter = new RateLimiter({ maxRequests: 100, windowMs: 60_000 });
const cache = new Map<string, { departuresPerHour: number; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!limiter.check(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const lat = parseFloat(request.nextUrl.searchParams.get('lat') || '');
  const lng = parseFloat(request.nextUrl.searchParams.get('lng') || '');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const roundedLat = (Math.round(lat * 200) / 200).toFixed(4);
  const roundedLng = (Math.round(lng * 200) / 200).toFixed(4);
  const cacheKey = `transit:${roundedLat}:${roundedLng}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ departuresPerHour: cached.departuresPerHour });
  }

  const departuresPerHour = await fetchTransitMetrics(lat, lng);
  cache.set(cacheKey, { departuresPerHour, timestamp: Date.now() });
  return NextResponse.json({ departuresPerHour });
}