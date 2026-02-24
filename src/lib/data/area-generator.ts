import type { GeoLocation } from '@/lib/survey/types';

export interface CandidateArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export function generateCandidateAreas(
  center: GeoLocation,
  radiusKm: number,
  spacingKm: number = 2
): CandidateArea[] {
  const areas: CandidateArea[] = [];

  // Convert km to degrees (rough approximations)
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((center.lat * Math.PI) / 180);

  const spacingLat = spacingKm / kmPerDegLat;
  const spacingLng = spacingKm / kmPerDegLng;

  // Hex grid vertical spacing: sqrt(3)/2 * horizontal spacing
  const rowSpacingLat = spacingLat * (Math.sqrt(3) / 2);

  const maxOffsetLat = radiusKm / kmPerDegLat;
  const maxOffsetLng = radiusKm / kmPerDegLng;

  let rowIndex = 0;

  for (let dLat = -maxOffsetLat; dLat <= maxOffsetLat; dLat += rowSpacingLat) {
    // Offset every other row by half the horizontal spacing for hex pattern
    const lngOffset = rowIndex % 2 === 1 ? spacingLng / 2 : 0;

    for (let dLng = -maxOffsetLng; dLng <= maxOffsetLng; dLng += spacingLng) {
      const lat = center.lat + dLat;
      const lng = center.lng + dLng + lngOffset;

      // Check if point is within the circular radius
      const distKm = Math.sqrt(
        Math.pow(dLat * kmPerDegLat, 2) +
        Math.pow((dLng + lngOffset) * kmPerDegLng, 2)
      );

      if (distKm <= radiusKm) {
        const roundedLat = Math.round(lat * 10000) / 10000;
        const roundedLng = Math.round(lng * 10000) / 10000;
        const id = `area_${roundedLat}_${roundedLng}`;

        areas.push({
          id,
          name: '',
          lat: roundedLat,
          lng: roundedLng,
        });
      }
    }

    rowIndex++;
  }

  return areas;
}
