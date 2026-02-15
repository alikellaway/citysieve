export interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

export async function queryAmenities(
  lat: number,
  lng: number,
  radiusMeters: number = 1000
): Promise<Record<string, number>> {
  const query = `[out:json][timeout:30];
(
  node["shop"="supermarket"](around:${radiusMeters},${lat},${lng});
  node["shop"="convenience"](around:${radiusMeters},${lat},${lng});
  node["shop"](around:${radiusMeters},${lat},${lng});
  node["amenity"="pub"](around:${radiusMeters},${lat},${lng});
  node["amenity"="bar"](around:${radiusMeters},${lat},${lng});
  node["amenity"="restaurant"](around:${radiusMeters},${lat},${lng});
  node["amenity"="cafe"](around:${radiusMeters},${lat},${lng});
  node["leisure"="park"](around:${radiusMeters},${lat},${lng});
  node["leisure"="garden"](around:${radiusMeters},${lat},${lng});
  node["leisure"="fitness_centre"](around:${radiusMeters},${lat},${lng});
  node["leisure"="sports_centre"](around:${radiusMeters},${lat},${lng});
  node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lng});
  node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  node["amenity"="doctors"](around:${radiusMeters},${lat},${lng});
  node["amenity"="library"](around:${radiusMeters},${lat},${lng});
  node["amenity"="theatre"](around:${radiusMeters},${lat},${lng});
  node["amenity"="cinema"](around:${radiusMeters},${lat},${lng});
  node["railway"="station"](around:${radiusMeters},${lat},${lng});
  node["railway"="halt"](around:${radiusMeters},${lat},${lng});
  node["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});
);
out body;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) {
    throw new Error(`Overpass request failed: ${res.status} ${res.statusText}`);
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
    trainStation: 0,
    busStop: 0,
  };

  for (const el of (raw.elements || []) as OverpassElement[]) {
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

  return counts;
}
