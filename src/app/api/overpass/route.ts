import { NextRequest, NextResponse } from 'next/server';

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function roundCoord(n: number): number {
  return Math.round(n * 200) / 200; // ~500m precision
}

export async function GET(request: NextRequest) {
  const lat = parseFloat(request.nextUrl.searchParams.get('lat') || '');
  const lng = parseFloat(request.nextUrl.searchParams.get('lng') || '');
  const radius = parseInt(request.nextUrl.searchParams.get('radius') || '1000');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const rlat = roundCoord(lat);
  const rlng = roundCoord(lng);
  const cacheKey = `overpass:${rlat}:${rlng}:${radius}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const query = `[out:json][timeout:30];
(
  node["shop"="supermarket"](around:${radius},${lat},${lng});
  node["shop"="convenience"](around:${radius},${lat},${lng});
  node["shop"](around:${radius},${lat},${lng});
  node["amenity"="pub"](around:${radius},${lat},${lng});
  node["amenity"="bar"](around:${radius},${lat},${lng});
  node["amenity"="restaurant"](around:${radius},${lat},${lng});
  node["amenity"="cafe"](around:${radius},${lat},${lng});
  node["leisure"="park"](around:${radius},${lat},${lng});
  node["leisure"="garden"](around:${radius},${lat},${lng});
  node["leisure"="fitness_centre"](around:${radius},${lat},${lng});
  node["leisure"="sports_centre"](around:${radius},${lat},${lng});
  node["amenity"="pharmacy"](around:${radius},${lat},${lng});
  node["amenity"="hospital"](around:${radius},${lat},${lng});
  node["amenity"="doctors"](around:${radius},${lat},${lng});
  node["amenity"="library"](around:${radius},${lat},${lng});
  node["amenity"="theatre"](around:${radius},${lat},${lng});
  node["amenity"="cinema"](around:${radius},${lat},${lng});
  node["amenity"="school"](around:${radius},${lat},${lng});
  node["amenity"="kindergarten"](around:${radius},${lat},${lng});
  node["railway"="station"](around:${radius},${lat},${lng});
  node["railway"="halt"](around:${radius},${lat},${lng});
  node["highway"="bus_stop"](around:${radius},${lat},${lng});
);
out body;`;

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];
const FETCH_TIMEOUT = 15000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || FETCH_TIMEOUT);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(
  query: string,
  endpointIndex = 0
): Promise<Response> {
  if (endpointIndex >= OVERPASS_ENDPOINTS.length) {
    throw new Error('All Overpass endpoints failed');
  }

  const endpoint = OVERPASS_ENDPOINTS[endpointIndex];

  try {
    const res = await fetchWithTimeout(endpoint, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: FETCH_TIMEOUT,
    });
    return res;
  } catch (error) {
    if (endpointIndex < OVERPASS_ENDPOINTS.length - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (endpointIndex + 1)));
      return fetchWithRetry(query, endpointIndex + 1);
    }
    throw error;
  }
}

  let res: Response;
  try {
    res = await fetchWithRetry(query);
  } catch (error) {
    console.error('Overpass fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Overpass data. Please try again later.' },
      { status: 503 }
    );
  }

  const raw = await res.json();

  const counts: Record<string, number> = {
    supermarkets: 0,
    highStreet: 0,
    pubsBars: 0,
    restaurantsCafes: 0,
    parksGreenSpaces: 0,
    gymsLeisure: 0,
    healthcare: 0,
    librariesCulture: 0,
    schools: 0,
    trainStation: 0,
    busStop: 0,
  };

  for (const el of raw.elements || []) {
    const tags = el.tags || {};
    if (tags.shop === 'supermarket' || tags.shop === 'convenience') counts.supermarkets++;
    if (tags.shop) counts.highStreet++;
    if (tags.amenity === 'pub' || tags.amenity === 'bar') counts.pubsBars++;
    if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') counts.restaurantsCafes++;
    if (tags.leisure === 'park' || tags.leisure === 'garden') counts.parksGreenSpaces++;
    if (tags.leisure === 'fitness_centre' || tags.leisure === 'sports_centre') counts.gymsLeisure++;
    if (tags.amenity === 'pharmacy' || tags.amenity === 'hospital' || tags.amenity === 'doctors') counts.healthcare++;
    if (tags.amenity === 'library' || tags.amenity === 'theatre' || tags.amenity === 'cinema') counts.librariesCulture++;
    if (tags.amenity === 'school' || tags.amenity === 'kindergarten') counts.schools++;
    if (tags.railway === 'station' || tags.railway === 'halt') counts.trainStation++;
    if (tags.highway === 'bus_stop') counts.busStop++;
  }

  cache.set(cacheKey, { data: counts, timestamp: Date.now() });
  return NextResponse.json(counts);
}
