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
  node["railway"="station"](around:${radius},${lat},${lng});
  node["railway"="halt"](around:${radius},${lat},${lng});
  node["highway"="bus_stop"](around:${radius},${lat},${lng});
);
out body;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

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
    if (tags.railway === 'station' || tags.railway === 'halt') counts.trainStation++;
    if (tags.highway === 'bus_stop') counts.busStop++;
  }

  cache.set(cacheKey, { data: counts, timestamp: Date.now() });
  return NextResponse.json(counts);
}
