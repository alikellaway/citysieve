import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  const latStr = request.nextUrl.searchParams.get('lat');
  const lngStr = request.nextUrl.searchParams.get('lng');
  const radiusKm = parseFloat(request.nextUrl.searchParams.get('radiusKm') || '2');

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

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
      // Decay score max 1.0 at center, 0 at edge
      const decay = Math.max(0, 1 - distKm / radiusKm);
      
      let ratingMultiplier = 0.2; // Unrated
      if (school.ofstedRating === 1) ratingMultiplier = 1.0;
      else if (school.ofstedRating === 2) ratingMultiplier = 0.7;
      else if (school.ofstedRating === 3) ratingMultiplier = 0.3;
      else if (school.ofstedRating === 4) ratingMultiplier = 0.0;

      totalScore += decay * ratingMultiplier;
    }
  }

  return NextResponse.json({ schoolScore: totalScore });
}