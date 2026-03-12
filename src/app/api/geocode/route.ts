import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limit';

const limiter = new RateLimiter({ maxRequests: 20, windowMs: 60_000 });
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    city_district?: string;
    town?: string;
    village?: string;
    county?: string;
    [key: string]: string | undefined;
  };
}

const TYPE_PRIORITY: Record<string, number> = {
  city: 1,
  town: 2,
  village: 3,
  city_district: 4,
  suburb: 5,
  county: 6,
  hamlet: 7,
  residential: 8,
};

function rankResults(results: NominatimResult[], countrycodes: string): NominatimResult[] {
  const isUK = countrycodes.split(',').some(c => c.trim().toLowerCase() === 'gb');
  
  return [...results].sort((a, b) => {
    const addrA = a.address;
    const addrB = b.address;

    if (isUK && addrA && addrB) {
      const typeA = Object.keys(addrA).find(k => TYPE_PRIORITY[k]) || 'other';
      const typeB = Object.keys(addrB).find(k => TYPE_PRIORITY[k]) || 'other';
      
      const priorityA = TYPE_PRIORITY[typeA] ?? 99;
      const priorityB = TYPE_PRIORITY[typeB] ?? 99;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const cityA = addrA.city;
      const cityB = addrB.city;
      if (cityA && cityB && cityA !== cityB) {
        return cityA.length - cityB.length;
      }
    }

    return 0;
  });
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!limiter.check(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

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

  if (Array.isArray(data) && data.length > 0) {
    const ranked = rankResults(data, countrycodes);
    cache.set(cacheKey, { data: ranked, timestamp: Date.now() });
    return NextResponse.json(ranked);
  }

  cache.set(cacheKey, { data, timestamp: Date.now() });
  return NextResponse.json(data);
}
