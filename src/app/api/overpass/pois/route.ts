import { NextRequest, NextResponse } from 'next/server';
import type { Poi, AmenityCategory } from '@/lib/poi-types';

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

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

export async function GET(request: NextRequest) {
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
  node["shop"="supermarket"](around:${radius},${lat},${lng});
  node["shop"="convenience"](around:${radius},${lat},${lng});
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

  const pois: Poi[] = [];
  for (const el of raw.elements || []) {
    if (el.type !== 'node' || !el.lat || !el.lon) continue;
    const tags = el.tags || {};
    const category = categorizeElement(tags);
    if (!category) continue;

    pois.push({
      id: el.id,
      lat: el.lat,
      lng: el.lon,
      name: tags.name || getTypeLabel(tags),
      type: getTypeLabel(tags),
      category,
    });
  }

  cache.set(cacheKey, { data: pois, timestamp: Date.now() });
  return NextResponse.json(pois);
}
