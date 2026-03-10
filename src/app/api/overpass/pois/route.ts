import { NextRequest, NextResponse } from 'next/server';
import type { Poi, AmenityCategory } from '@/lib/poi-types';
import { RateLimiter } from '@/lib/rate-limit';

const limiter = new RateLimiter({ maxRequests: 30, windowMs: 60_000 });
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];
const FETCH_TIMEOUT = 15000;

function roundCoord(n: number): number {
  return Math.round(n * 200) / 200;
}

function categorizeElement(tags: Record<string, string>): AmenityCategory | null {
  if (tags.shop === 'supermarket' || tags.shop === 'convenience') return 'supermarkets';
  if (tags.amenity === 'pub' || tags.amenity === 'bar') return 'pubsBars';
  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') return 'restaurantsCafes';
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'parksGreenSpaces';
  if (tags.leisure === 'fitness_centre' || tags.leisure === 'sports_centre') return 'gymsLeisure';
  if (tags.amenity === 'pharmacy' || tags.amenity === 'hospital' || tags.amenity === 'doctors') return 'healthcare';
  if (tags.amenity === 'library' || tags.amenity === 'theatre' || tags.amenity === 'cinema') return 'librariesCulture';
  if (tags.railway === 'station' || tags.railway === 'halt') return 'trainStation';
  if (tags.highway === 'bus_stop') return 'busStop';
  return null;
}

function getTypeLabel(tags: Record<string, string>): string {
  if (tags.shop === 'supermarket') return 'Supermarket';
  if (tags.shop === 'convenience') return 'Convenience Store';
  if (tags.amenity === 'pub') return 'Pub';
  if (tags.amenity === 'bar') return 'Bar';
  if (tags.amenity === 'restaurant') return 'Restaurant';
  if (tags.amenity === 'cafe') return 'Cafe';
  if (tags.leisure === 'park') return 'Park';
  if (tags.leisure === 'garden') return 'Garden';
  if (tags.leisure === 'fitness_centre') return 'Gym';
  if (tags.leisure === 'sports_centre') return 'Sports Centre';
  if (tags.amenity === 'pharmacy') return 'Pharmacy';
  if (tags.amenity === 'hospital') return 'Hospital';
  if (tags.amenity === 'doctors') return 'Doctors';
  if (tags.amenity === 'library') return 'Library';
  if (tags.amenity === 'theatre') return 'Theatre';
  if (tags.amenity === 'cinema') return 'Cinema';
  if (tags.railway === 'station') return 'Train Station';
  if (tags.railway === 'halt') return 'Rail Halt';
  if (tags.highway === 'bus_stop') return 'Bus Stop';
  return 'Point of Interest';
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromOverpass(query: string, endpointIndex = 0): Promise<Response> {
  if (endpointIndex >= OVERPASS_ENDPOINTS.length) {
    throw new Error('All Overpass endpoints failed');
  }
  const endpoint = OVERPASS_ENDPOINTS[endpointIndex];
  try {
    const res = await fetchWithTimeout(endpoint, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    // Retry on rate limiting or server errors
    if (!res.ok && endpointIndex < OVERPASS_ENDPOINTS.length - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (endpointIndex + 1)));
      return fetchFromOverpass(query, endpointIndex + 1);
    }
    return res;
  } catch {
    if (endpointIndex < OVERPASS_ENDPOINTS.length - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (endpointIndex + 1)));
      return fetchFromOverpass(query, endpointIndex + 1);
    }
    throw new Error('All Overpass endpoints failed');
  }
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
  const radius = parseInt(request.nextUrl.searchParams.get('radius') || '1000');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const rlat = roundCoord(lat);
  const rlng = roundCoord(lng);
  const cacheKey = `pois:${rlat}:${rlng}:${radius}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const query = `[out:json][timeout:30];
(
  nwr["shop"="supermarket"](around:${radius},${lat},${lng});
  nwr["shop"="convenience"](around:${radius},${lat},${lng});
  nwr["amenity"="pub"](around:${radius},${lat},${lng});
  nwr["amenity"="bar"](around:${radius},${lat},${lng});
  nwr["amenity"="restaurant"](around:${radius},${lat},${lng});
  nwr["amenity"="cafe"](around:${radius},${lat},${lng});
  nwr["leisure"="park"](around:${radius},${lat},${lng});
  nwr["leisure"="garden"](around:${radius},${lat},${lng});
  nwr["leisure"="fitness_centre"](around:${radius},${lat},${lng});
  nwr["leisure"="sports_centre"](around:${radius},${lat},${lng});
  nwr["amenity"="pharmacy"](around:${radius},${lat},${lng});
  nwr["amenity"="hospital"](around:${radius},${lat},${lng});
  nwr["amenity"="doctors"](around:${radius},${lat},${lng});
  nwr["amenity"="library"](around:${radius},${lat},${lng});
  nwr["amenity"="theatre"](around:${radius},${lat},${lng});
  nwr["amenity"="cinema"](around:${radius},${lat},${lng});
  nwr["railway"="station"](around:${radius},${lat},${lng});
  nwr["railway"="halt"](around:${radius},${lat},${lng});
  nwr["highway"="bus_stop"](around:${radius},${lat},${lng});
);
out center body;`;

  let raw: { elements?: Array<Record<string, unknown>> };
  try {
    const res = await fetchFromOverpass(query);
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Overpass API unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    raw = await res.json();
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach Overpass API. Please try again later.' },
      { status: 503 }
    );
  }

  const pois: Poi[] = [];
  const seen = new Set<number>();
  for (const el of raw.elements || []) {
    // Nodes have lat/lon directly; ways/relations get a centroid via `out center`
    const elLat = (el.lat as number | undefined) ?? (el.center as Record<string, number> | undefined)?.lat;
    const elLon = (el.lon as number | undefined) ?? (el.center as Record<string, number> | undefined)?.lon;
    if (!elLat || !elLon) continue;
    const elId = el.id as number;
    if (seen.has(elId)) continue;
    seen.add(elId);

    const tags = (el.tags as Record<string, string>) || {};
    const category = categorizeElement(tags);
    if (!category) continue;

    pois.push({
      id: elId,
      lat: elLat,
      lng: elLon,
      name: tags.name || getTypeLabel(tags),
      type: getTypeLabel(tags),
      category,
    });
  }

  cache.set(cacheKey, { data: pois, timestamp: Date.now() });
  return NextResponse.json(pois);
}
