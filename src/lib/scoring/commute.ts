import type { CommuteMode } from '@/lib/survey/types';

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateCommuteTime(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: CommuteMode
): number {
  const distanceKm = haversineDistance(fromLat, fromLng, toLat, toLng);

  switch (mode) {
    case 'drive':
      return (distanceKm / 30) * 60;
    case 'train':
      return (distanceKm / 50) * 60 + 10;
    case 'bus':
      return (distanceKm / 15) * 60;
    case 'cycle':
      return (distanceKm / 15) * 60;
    case 'walk':
      return (distanceKm / 5) * 60;
    default:
      return (distanceKm / 30) * 60;
  }
}

export function bestCommuteTime(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  modes: CommuteMode[]
): number {
  if (modes.length === 0) {
    return estimateCommuteTime(fromLat, fromLng, toLat, toLng, 'drive');
  }

  const times = modes.map((mode) =>
    estimateCommuteTime(fromLat, fromLng, toLat, toLng, mode)
  );

  return Math.min(...times);
}

/** Returns estimated commute minutes for each of the given modes. */
export function commuteBreakdown(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  modes: CommuteMode[]
): Partial<Record<CommuteMode, number>> {
  return Object.fromEntries(
    modes.map((mode) => [mode, estimateCommuteTime(fromLat, fromLng, toLat, toLng, mode)])
  ) as Partial<Record<CommuteMode, number>>;
}
