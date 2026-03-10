import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limit';
import { getWalkingIsochrone } from '@/lib/data/routing';
import { haversineDistance } from '@/lib/scoring/commute';

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

  const polygon = await getWalkingIsochrone(lat, lng);
  const polyString = polygon.map(p => `${p[0]} ${p[1]}`).join(' ');

  const query = `[out:json][timeout:30];
(
  nwr["shop"="supermarket"](poly:"${polyString}");
  nwr["shop"="convenience"](poly:"${polyString}");
  nwr["shop"](poly:"${polyString}");
  nwr["amenity"="pub"](poly:"${polyString}");
  nwr["amenity"="bar"](poly:"${polyString}");
  nwr["amenity"="restaurant"](poly:"${polyString}");
  nwr["amenity"="cafe"](poly:"${polyString}");
  nwr["leisure"="park"](poly:"${polyString}");
  nwr["leisure"="garden"](poly:"${polyString}");
  nwr["leisure"="fitness_centre"](poly:"${polyString}");
  nwr["leisure"="sports_centre"](poly:"${polyString}");
  nwr["amenity"="pharmacy"](poly:"${polyString}");
  nwr["amenity"="hospital"](poly:"${polyString}");
  nwr["amenity"="doctors"](poly:"${polyString}");
  nwr["amenity"="library"](poly:"${polyString}");
  nwr["amenity"="theatre"](poly:"${polyString}");
  nwr["amenity"="cinema"](poly:"${polyString}");
  nwr["amenity"="school"](poly:"${polyString}");
  nwr["amenity"="kindergarten"](poly:"${polyString}");
  nwr["railway"="station"](poly:"${polyString}");
  nwr["railway"="halt"](poly:"${polyString}");
  nwr["highway"="bus_stop"](poly:"${polyString}");
);
out center bb body;`;

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
  let raw: { 
    elements?: Array<{ 
      lat?: number; 
      lon?: number; 
      center?: { lat: number; lon: number }; 
      bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
      tags?: Record<string, string> 
    }> 
  };
  try {
    res = await fetchWithRetry(query);
    raw = await res.json();
  } catch (error) {
    console.error('Overpass fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Overpass data. Please try again later.' },
      { status: 503 }
    );
  }

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
    const elementLat = el.lat ?? el.center?.lat;
    const elementLon = el.lon ?? el.center?.lon;
    
    if (elementLat === undefined || elementLon === undefined) continue;

    const distMeters = haversineDistance(lat, lng, elementLat, elementLon) * 1000;
    const MAX_DECAY_M = 1500;
    const decayScore = Math.max(0, 1 - distMeters / MAX_DECAY_M);

    if (decayScore <= 0) continue; // Outside practical walking range, shouldn't happen with exact isochrone but good safeguard

    const tags = el.tags || {};
    
    let multiplier = 1.0;
    
    // Apply size multiplier for parks based on bounding box
    if ((tags.leisure === 'park' || tags.leisure === 'garden') && el.bounds) {
      const { minlat, minlon, maxlat, maxlon } = el.bounds;
      // Approximate area in sq meters: (dLat * 111000) * (dLon * 111000)
      const latDiff = Math.abs(maxlat - minlat) * 111000;
      const lonDiff = Math.abs(maxlon - minlon) * 111000 * Math.cos(elementLat * Math.PI / 180);
      const areaSqM = latDiff * lonDiff;
      multiplier = Math.min(5, 1 + areaSqM / 10000);
    }
    
    // Apply quality/brand multiplier for supermarkets
    if (tags.shop === 'supermarket') {
      const brand = (tags.brand || tags.name || '').toLowerCase();
      if (brand.includes('tesco extra') || brand.includes('asda') || brand.includes('morrisons')) {
        multiplier = 2.0;
      } else if (brand.includes('sainsbury') || brand.includes('waitrose')) {
        multiplier = 1.5;
      } else if (brand.includes('aldi') || brand.includes('lidl') || brand.includes('iceland')) {
        multiplier = 1.2;
      }
    }

    const finalScore = decayScore * multiplier;

    if (tags.shop === 'supermarket' || tags.shop === 'convenience') counts.supermarkets += finalScore;
    if (tags.shop) counts.highStreet += finalScore;
    if (tags.amenity === 'pub' || tags.amenity === 'bar') counts.pubsBars += finalScore;
    if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') counts.restaurantsCafes += finalScore;
    if (tags.leisure === 'park' || tags.leisure === 'garden') counts.parksGreenSpaces += finalScore;
    if (tags.leisure === 'fitness_centre' || tags.leisure === 'sports_centre') counts.gymsLeisure += finalScore;
    if (tags.amenity === 'pharmacy' || tags.amenity === 'hospital' || tags.amenity === 'doctors') counts.healthcare += finalScore;
    if (tags.amenity === 'library' || tags.amenity === 'theatre' || tags.amenity === 'cinema') counts.librariesCulture += finalScore;
    if (tags.amenity === 'school' || tags.amenity === 'kindergarten') counts.schools += finalScore;
    if (tags.railway === 'station' || tags.railway === 'halt') counts.trainStation += finalScore;
    if (tags.highway === 'bus_stop') counts.busStop += finalScore;
  }

  cache.set(cacheKey, { data: counts, timestamp: Date.now() });
  return NextResponse.json(counts);
}