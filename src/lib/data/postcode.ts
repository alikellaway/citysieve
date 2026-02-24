import { type CandidateArea } from './area-generator';

export interface PostcodeResult {
  outcode: string;
  placeName: string | null;
}

interface PostcodesIoResponse {
  status: number;
  result: Array<{
    outcode: string;
    admin_ward: string | null;
    admin_district: string | null;
  }> | null;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { result: PostcodeResult; expires: number }>();

function getCacheKey(lat: number, lng: number): string {
  const roundedLat = lat.toFixed(4);
  const roundedLng = lng.toFixed(4);
  return `${roundedLat},${roundedLng}`;
}

export async function getPostcodeDistrict(lat: number, lng: number): Promise<PostcodeResult | null> {
  const key = getCacheKey(lat, lng);
  const cached = cache.get(key);

  if (cached && cached.expires > Date.now()) {
    return cached.result;
  }

  try {
    const url = `https://api.postcodes.io/postcodes/lon/${lng}/lat/${lat}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CitySieve/1.0' },
    });

    if (!res.ok) {
      return null;
    }

    const data: PostcodesIoResponse = await res.json();

    if (data.status !== 200 || !data.result || data.result.length === 0) {
      return null;
    }

    const nearest = data.result[0];
    const placeName = nearest.admin_ward || nearest.admin_district || null;

    const result: PostcodeResult = {
      outcode: nearest.outcode,
      placeName,
    };

    cache.set(key, {
      result,
      expires: Date.now() + CACHE_TTL_MS,
    });

    return result;
  } catch {
    return null;
  }
}

interface BulkGeolocation {
  longitude: number;
  latitude: number;
}

interface BulkPostcodesResponse {
  status: number;
  result: Array<{
    query: string;
    result: {
      outcode: string;
      admin_ward: string | null;
      admin_district: string | null;
    } | null;
  }> | null;
}

export async function filterValidCandidates(
  candidates: CandidateArea[]
): Promise<CandidateArea[]> {
  const BATCH_SIZE = 100;
  const validCandidates: CandidateArea[] = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);

    const geolocations: BulkGeolocation[] = batch.map((c) => ({
      longitude: c.lng,
      latitude: c.lat,
    }));

    try {
      const res = await fetch('https://api.postcodes.io/postcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'CitySieve/1.0' },
        body: JSON.stringify({
          geolocations,
          radius: 2000,
          limit: 1,
        }),
      });

      if (!res.ok) {
        for (const c of batch) {
          validCandidates.push(c);
        }
        continue;
      }

      const data: BulkPostcodesResponse = await res.json();

      if (data.status === 200 && data.result) {
        for (let j = 0; j < batch.length; j++) {
          const lookupResult = data.result[j];
          if (lookupResult?.result) {
            validCandidates.push(batch[j]);
          }
        }
      }
    } catch {
      for (const c of batch) {
        validCandidates.push(c);
      }
    }
  }

  return validCandidates;
}
