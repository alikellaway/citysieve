import { NextRequest, NextResponse } from 'next/server';
import { fetchSchoolMetrics } from '@/lib/data/metrics';

export async function GET(request: NextRequest) {
  const latStr = request.nextUrl.searchParams.get('lat');
  const lngStr = request.nextUrl.searchParams.get('lng');
  const radiusKm = parseFloat(request.nextUrl.searchParams.get('radiusKm') || '2');

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  const totalScore = await fetchSchoolMetrics(lat, lng, radiusKm);
  return NextResponse.json({ schoolScore: totalScore });
}