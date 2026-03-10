export interface IsochroneResult {
  polygon: [number, number][]; // [lat, lng] array
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { result: [number, number][]; expires: number }>();

function getCacheKey(lat: number, lng: number): string {
  // ~500m precision to reuse isochrones for nearby points
  const roundedLat = (Math.round(lat * 200) / 200).toFixed(4);
  const roundedLng = (Math.round(lng * 200) / 200).toFixed(4);
  return `${roundedLat},${roundedLng}`;
}

// Fallback: generates a geometric circle polygon of ~15 mins walk (approx 1.25km)
function generateFallbackPolygon(lat: number, lng: number, radiusKm: number = 1.25): [number, number][] {
  const points = 16;
  const polygon: [number, number][] = [];
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((lat * Math.PI) / 180);

  for (let i = 0; i < points; i++) {
    const angle = (i * 360) / points;
    const rad = (angle * Math.PI) / 180;
    const dLat = (Math.sin(rad) * radiusKm) / kmPerDegLat;
    const dLng = (Math.cos(rad) * radiusKm) / kmPerDegLng;
    polygon.push([lat + dLat, lng + dLng]);
  }
  return polygon;
}

export async function getWalkingIsochrone(lat: number, lng: number): Promise<[number, number][]> {
  const key = getCacheKey(lat, lng);
  const cached = cache.get(key);

  if (cached && cached.expires > Date.now()) {
    return cached.result;
  }

  const apiKey = process.env.ORS_API_KEY;

  if (!apiKey) {
    console.warn('ORS_API_KEY not found. Falling back to geometric circle for isochrone.');
    const fallback = generateFallbackPolygon(lat, lng);
    cache.set(key, { result: fallback, expires: Date.now() + CACHE_TTL_MS });
    return fallback;
  }

  try {
    const url = 'https://api.openrouteservice.org/v2/isochrones/foot-walking';
    
    const body = {
      locations: [[lng, lat]], // ORS takes [lng, lat]
      range: [900] // 900 seconds = 15 minutes
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
        'Authorization': apiKey,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      console.error(`ORS API failed with status ${res.status}: ${res.statusText}`);
      const fallback = generateFallbackPolygon(lat, lng);
      return fallback;
    }

    const data = await res.json();
    
    if (data.features && data.features.length > 0 && data.features[0].geometry.coordinates.length > 0) {
      // ORS returns [[[lng, lat], [lng, lat], ...]]
      const coords = data.features[0].geometry.coordinates[0];
      const polygon: [number, number][] = coords.map((c: number[]) => [c[1], c[0]]); // Convert back to [lat, lng]
      
      cache.set(key, { result: polygon, expires: Date.now() + CACHE_TTL_MS });
      return polygon;
    }

    const fallback = generateFallbackPolygon(lat, lng);
    return fallback;
  } catch (error) {
    console.error('Failed to fetch isochrone:', error);
    return generateFallbackPolygon(lat, lng);
  }
}