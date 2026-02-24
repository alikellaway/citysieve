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
