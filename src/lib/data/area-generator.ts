import type { GeoLocation } from '@/lib/survey/types';

export interface CandidateArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  outcode?: string;
  metrics?: {
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
    crimeScore: number;
  } | null;
}

export async function fetchCandidateAreas(
  center: GeoLocation,
  radiusKm: number
): Promise<CandidateArea[]> {
  const url = `/api/candidates?lat=${center.lat}&lng=${center.lng}&radius=${radiusKm}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch candidate areas from DB');
  }
  return res.json();
}
