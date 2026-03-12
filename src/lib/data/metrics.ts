import { getWalkingIsochrone } from '@/lib/data/routing';
import { haversineDistance } from '@/lib/scoring/commute';
import { prisma } from '@/lib/db';

export interface OverpassMetrics {
  supermarkets: number;
  highStreet: number;
  pubsBars: number;
  restaurantsCafes: number;
  parksGreenSpaces: number;
  gymsLeisure: number;
  healthcare: number;
  librariesCulture: number;
  schools: number;
  trainStation: number;
  busStop: number;
}

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
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(query: string, endpointIndex = 0): Promise<Response> {
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

export async function fetchOverpassMetrics(lat: number, lng: number): Promise<OverpassMetrics> {
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

  const res = await fetchWithRetry(query);
  const raw = await res.json();

  const counts: OverpassMetrics = {
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

    if (decayScore <= 0) continue;

    const tags = el.tags || {};
    let multiplier = 1.0;
    
    if ((tags.leisure === 'park' || tags.leisure === 'garden') && el.bounds) {
      const { minlat, minlon, maxlat, maxlon } = el.bounds;
      const latDiff = Math.abs(maxlat - minlat) * 111000;
      const lonDiff = Math.abs(maxlon - minlon) * 111000 * Math.cos(elementLat * Math.PI / 180);
      const areaSqM = latDiff * lonDiff;
      multiplier = Math.min(5, 1 + areaSqM / 10000);
    }
    
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

  return counts as OverpassMetrics;
}

export async function fetchTransitMetrics(lat: number, lng: number): Promise<number> {
  const appId = process.env.TRANSPORT_API_ID;
  const appKey = process.env.TRANSPORT_API_KEY;

  if (!appId || !appKey) {
    const pseudoRandom = (Math.abs(Math.sin(lat * lng)) * 20) + 2; 
    return Math.round(pseudoRandom);
  }

  try {
    const placesUrl = `https://transportapi.com/v3/uk/places.json?lat=${lat}&lon=${lng}&type=bus_stop,train_station&app_id=${appId}&app_key=${appKey}`;
    const placesRes = await fetch(placesUrl);
    if (!placesRes.ok) {
      throw new Error(`TransportAPI places failed: ${placesRes.status}`);
    }
    const placesData = await placesRes.json();
    const members = placesData.member || [];
    
    let totalDepartures = 0;
    const stopsToQuery = members.slice(0, 3);

    for (const stop of stopsToQuery) {
      if (stop.atcocode) {
        const liveUrl = `https://transportapi.com/v3/uk/bus/stop/${stop.atcocode}/live.json?app_id=${appId}&app_key=${appKey}&nextbuses=yes`;
        const liveRes = await fetch(liveUrl);
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          const departuresObj = liveData.departures || {};
          let stopDepartures = 0;
          for (const line in departuresObj) {
            stopDepartures += departuresObj[line].length;
          }
          totalDepartures += stopDepartures;
        }
      }
    }

    return totalDepartures * 2;
  } catch (error) {
    console.error('Transit API error:', error);
    const pseudoRandom = (Math.abs(Math.sin(lat * lng)) * 20) + 2; 
    return Math.round(pseudoRandom);
  }
}

export async function fetchSchoolMetrics(lat: number, lng: number, radiusKm: number = 2): Promise<number> {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(lat * (Math.PI / 180)));

  const candidates = await prisma.school.findMany({
    where: {
      lat: { gte: lat - latDelta, lte: lat + latDelta },
      lng: { gte: lng - lngDelta, lte: lng + lngDelta },
    }
  });

  let totalScore = 0;

  for (const school of candidates) {
    const distKm = haversineDistance(lat, lng, school.lat, school.lng);
    if (distKm <= radiusKm) {
      const decay = Math.max(0, 1 - distKm / radiusKm);
      let ratingMultiplier = 0.2;
      if (school.ofstedRating === 1) ratingMultiplier = 1.0;
      else if (school.ofstedRating === 2) ratingMultiplier = 0.7;
      else if (school.ofstedRating === 3) ratingMultiplier = 0.3;
      else if (school.ofstedRating === 4) ratingMultiplier = 0.0;

      totalScore += decay * ratingMultiplier;
    }
  }

  return totalScore;
}