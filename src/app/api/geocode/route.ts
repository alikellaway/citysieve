import { NextRequest, NextResponse } from 'next/server';

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const countrycodes = request.nextUrl.searchParams.get('countrycodes') ?? '';
  const cacheKey = `geocode:${countrycodes}:${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');
  if (countrycodes) url.searchParams.set('countrycodes', countrycodes);

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'CitySieve/1.0' },
  });

  const data = await res.json();

  cache.set(cacheKey, { data, timestamp: Date.now() });
  return NextResponse.json(data);
}
