export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

export async function searchLocations(query: string): Promise<NominatimResult[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'CitySieve/1.0' },
  });

  if (!res.ok) {
    throw new Error(`Nominatim request failed: ${res.status} ${res.statusText}`);
  }

  const results: NominatimResult[] = await res.json();
  return results;
}
