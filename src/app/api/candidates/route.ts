import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

export async function GET(request: NextRequest) {
  const lat = parseFloat(request.nextUrl.searchParams.get('lat') || '');
  const lng = parseFloat(request.nextUrl.searchParams.get('lng') || '');
  const radiusKm = parseFloat(request.nextUrl.searchParams.get('radius') || '20');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  // Find bounding box for quick SQLite filter
  // 1 deg lat = 111km
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(lat * (Math.PI / 180)));

  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  const minLng = lng - lngDelta;
  const maxLng = lng + lngDelta;

  const candidates = await prisma.areaCentroid.findMany({
    where: {
      lat: { gte: minLat, lte: maxLat },
      lng: { gte: minLng, lte: maxLng },
    },
  });

  // Filter accurately using haversine
  const valid = candidates.filter(
    (c) => haversineDistance(lat, lng, c.lat, c.lng) <= radiusKm
  );

  const results = valid.map((c) => ({
    id: `outcode_${c.outcode.replace(/\s+/g, '_')}`,
    name: `${c.name}, ${c.outcode}`,
    outcode: c.outcode,
    lat: c.lat,
    lng: c.lng,
  }));

  return NextResponse.json(results);
}
