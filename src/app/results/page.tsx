'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSurvey } from '@/hooks/useSurvey';
import { generateCandidateAreas, type CandidateArea } from '@/lib/data/area-generator';
import { getPostcodeDistrict } from '@/lib/data/postcode';
import { bestCommuteTime, commuteBreakdown, haversineDistance } from '@/lib/scoring/commute';
import { scoreAndRankAreas, getFilterStatus, type AreaProfile, type ScoredArea } from '@/lib/scoring/engine';
import { ResultCard } from '@/components/results/ResultCard';
import { AreaInfoModal } from '@/components/results/AreaInfoModal';
import type { CandidateStatus } from '@/components/results/LoadingMap';
import { LoadingOverlay } from '@/components/results/LoadingOverlay';
import { LoadingProgressBar } from '@/components/results/LoadingProgressBar';
import { AdSlot } from '@/components/ads/AdSlot';
import { DonateButton } from '@/components/donate/DonateButton';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { GeoLocation } from '@/lib/survey/types';
import type L from 'leaflet';

type NominatimAddress = {
  suburb?: string;
  village?: string;
  hamlet?: string;
  city_district?: string;
  town?: string;
  city?: string;
};

type NominatimResult = {
  display_name: string;
  address?: NominatimAddress;
};

function extractAreaName(data: NominatimResult[]): string | null {
  if (!data.length || !data[0].address) return null;
  const addr = data[0].address;
  return addr.suburb || addr.village || addr.hamlet ||
         addr.city_district || addr.town || addr.city || null;
}

function getMatchedAddressType(addr: NominatimAddress | undefined): string | null {
  if (!addr) return null;
  if (addr.suburb) return 'suburb';
  if (addr.village) return 'village';
  if (addr.hamlet) return 'hamlet';
  if (addr.city_district) return 'city_district';
  if (addr.town) return 'town';
  if (addr.city) return 'city';
  return null;
}

function getCardinalDirection(
  centre: { lat: number; lng: number },
  point: { lat: number; lng: number }
): string | null {
  const latDiff = point.lat - centre.lat;
  const lngDiff = point.lng - centre.lng;

  if (Math.abs(latDiff) < 0.015 && Math.abs(lngDiff) < 0.02) return null;

  const isNorth = latDiff > 0.015;
  const isSouth = latDiff < -0.015;
  const isEast = lngDiff > 0.02;
  const isWest = lngDiff < -0.02;

  if (isNorth && isEast) return 'North East';
  if (isNorth && isWest) return 'North West';
  if (isSouth && isEast) return 'South East';
  if (isSouth && isWest) return 'South West';
  if (isNorth) return 'North';
  if (isSouth) return 'South';
  if (isEast) return 'East';
  if (isWest) return 'West';
  return null;
}

const FUN_PHRASES = [
  "Counting cafes and coffee shops",
  "Measuring green spaces",
  "Checking train connections",
  "Scouting local pubs",
  "Hunting for supermarkets",
  "Looking for gyms and leisure centres",
  "Finding libraries and museums",
  "Surveying restaurants",
  "Mapping bus routes",
  "Sniffing out bakeries",
  "Counting GP surgeries",
  "Checking for parks",
  "Locating dog-friendly spots",
  "Tallying up takeaways",
];

const ResultMap = dynamic(
  () => import('@/components/results/ResultMap').then((m) => m.ResultMap),
  { ssr: false, loading: () => <div className="h-[400px] w-full animate-pulse rounded-lg bg-muted" /> }
);

const LoadingMap = dynamic(
  () => import('@/components/results/LoadingMap').then((m) => m.LoadingMap),
  { ssr: false, loading: () => <div className="h-[calc(100vh-180px)] w-full animate-pulse bg-muted" /> }
);

async function fetchAmenities(lat: number, lng: number): Promise<Record<string, number>> {
  const res = await fetch(`/api/overpass?lat=${lat}&lng=${lng}&radius=1000`);
  if (!res.ok) throw new Error('Failed to fetch amenities');
  return res.json();
}

function classifyAreaType(distKm: number): AreaProfile['environment']['type'] {
  if (distKm < 3) return 'city_centre';
  if (distKm < 8) return 'inner_suburb';
  if (distKm < 15) return 'outer_suburb';
  if (distKm < 25) return 'town';
  return 'rural';
}

interface ResultRing {
  label: string;
  items: ScoredArea[];
}

type TransitionPhase = 'searching' | 'revealing' | 'done';

export default function ResultsPage() {
  const { state, reset } = useSurvey();
  const { data: session } = useSession();
  const router = useRouter();

  const [resultRings, setResultRings] = useState<ResultRing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [modalArea, setModalArea] = useState<ScoredArea | null>(null);
  const [saved, setSaved] = useState(false);
  const [searchedRadiusKm, setSearchedRadiusKm] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [candidates, setCandidates] = useState<CandidateArea[]>([]);
  const [candidateStatus, setCandidateStatus] = useState<Map<string, CandidateStatus>>(new Map());
  const [activeCandidateIndex, setActiveCandidateIndex] = useState<number | null>(null);
  const [currentAreaName, setCurrentAreaName] = useState<string | null>(null);
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [doneCount, setDoneCount] = useState(0);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('searching');
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const centreRef = useRef<GeoLocation | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasRun = useRef(false);
  const phraseIndexRef = useRef(0);

  const allResults = resultRings.flatMap((r) => r.items);

  const ringOffsets = resultRings.reduce<number[]>((acc, _, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + resultRings[i - 1].items.length);
    return acc;
  }, []);

  const getNextPhrase = useCallback(() => {
    const phrase = FUN_PHRASES[phraseIndexRef.current % FUN_PHRASES.length];
    phraseIndexRef.current++;
    return phrase;
  }, []);

  const runAnalysis = useCallback(async () => {
    if (hasRun.current) return;
    hasRun.current = true;

    try {
      const centre = state.commute.workLocation ??
        state.family.familyLocation ??
        { label: 'UK', lat: 53.48, lng: -2.24 };

      centreRef.current = centre;

      const allCandidates = generateCandidateAreas(centre, 20, 3);
      setCandidates(allCandidates);

      const initialStatus = new Map<string, CandidateStatus>();
      allCandidates.forEach(c => initialStatus.set(c.id, 'pending'));
      setCandidateStatus(initialStatus);
      setDoneCount(0);
      setCurrentPhrase(getNextPhrase());

      const BATCH_SIZE = 4;
      const areaProfiles: AreaProfile[] = [];
      const profileMap = new Map<string, AreaProfile>();

      for (let i = 0; i < allCandidates.length; i += BATCH_SIZE) {
        const batch = allCandidates.slice(i, i + BATCH_SIZE);

        setActiveCandidateIndex(i);

        setCandidateStatus(prev => {
          const newStatus = new Map(prev);
          batch.forEach(c => newStatus.set(c.id, 'checking'));
          return newStatus;
        });

        fetch(`/api/geocode?q=${batch[0].lat},${batch[0].lng}`)
          .then((r) => r.json())
          .then((data: NominatimResult[]) => {
            if (Array.isArray(data) && data.length > 0) {
              const name = extractAreaName(data) || data[0].display_name.split(',')[0].trim();
              setCurrentAreaName(name);
              setCurrentPhrase(getNextPhrase());
            }
          })
          .catch(() => {});

        const batchResults = await Promise.allSettled(
          batch.map(async (c) => {
            const [amenities, postcode] = await Promise.all([
              fetchAmenities(c.lat, c.lng),
              getPostcodeDistrict(c.lat, c.lng),
            ]);
            const distFromCentre = haversineDistance(centre.lat, centre.lng, c.lat, c.lng);

            let name: string;
            let outcode: string | undefined;
            if (postcode) {
              name = postcode.placeName
                ? `${postcode.placeName}, ${postcode.outcode}`
                : postcode.outcode;
              outcode = postcode.outcode;
            } else {
              name = `Area near [${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}]`;
            }

            const profile: AreaProfile = {
              id: c.id,
              name,
              outcode,
              coordinates: { lat: c.lat, lng: c.lng },
              amenities,
              normalizedAmenities: {},
              transport: {
                trainStationProximity: amenities.trainStation > 0 ? 1 : 0,
                busFrequency: Math.min(amenities.busStop / 10, 1),
              },
              environment: {
                type: classifyAreaType(distFromCentre),
                greenSpaceCoverage: Math.min((amenities.parksGreenSpaces || 0) / 5, 1),
              },
            };

            if (state.commute.workLocation && state.commute.commuteModes.length > 0) {
              profile.commuteEstimate = bestCommuteTime(
                c.lat,
                c.lng,
                state.commute.workLocation.lat,
                state.commute.workLocation.lng,
                state.commute.commuteModes,
              );
              profile.commuteBreakdown = commuteBreakdown(
                c.lat,
                c.lng,
                state.commute.workLocation.lat,
                state.commute.workLocation.lng,
                state.commute.commuteModes,
              );
            }

            return { candidateId: c.id, profile };
          })
        );

        for (const r of batchResults) {
          if (r.status === 'fulfilled') {
            areaProfiles.push(r.value.profile);
            profileMap.set(r.value.candidateId, r.value.profile);
          }
        }

        setCandidateStatus(prev => {
          const newStatus = new Map(prev);
          for (const r of batchResults) {
            if (r.status === 'fulfilled') {
              newStatus.set(r.value.candidateId, 'checked');
            }
          }
          return newStatus;
        });

        setDoneCount(Math.min(i + BATCH_SIZE, allCandidates.length));
      }

      setTransitionPhase('revealing');

      const finalStatus = new Map<string, CandidateStatus>();
      for (const candidate of allCandidates) {
        const profile = profileMap.get(candidate.id);
        if (profile) {
          const status = getFilterStatus(profile, state);
          finalStatus.set(candidate.id, status);
        } else {
          finalStatus.set(candidate.id, 'pending');
        }
      }
      setCandidateStatus(finalStatus);

      await new Promise(resolve => setTimeout(resolve, 1500));

      if (mapInstance) {
        mapInstance.flyTo([centre.lat, centre.lng], 9, { duration: 1.2 });
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      const scored = scoreAndRankAreas(areaProfiles, state);

      const namedResults = await Promise.all(
        scored.map(async (s) => {
          try {
            const res = await fetch(
              `/api/geocode?q=${s.area.coordinates.lat},${s.area.coordinates.lng}`
            );
            const data: NominatimResult[] = await res.json();

            if (data.length > 0) {
              let name = extractAreaName(data);

              if (!name) {
                const parts = data[0].display_name.split(',');
                name = parts[0].trim();
              }

              const addressType = getMatchedAddressType(data[0].address);
              if (addressType && ['city', 'town', 'city_district'].includes(addressType)) {
                const direction = getCardinalDirection(centre, s.area.coordinates);
                if (direction) {
                  name = `${direction} ${name}`;
                }
              }

              return { ...s, area: { ...s.area, name } };
            }
          } catch {
            // Keep the generated name
          }
          return s;
        })
      );

      setResultRings([{ label: 'Within 20 km', items: namedResults }]);
      setSearchedRadiusKm(20);
      setTransitionPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setTransitionPhase('done');
    }
  }, [state, candidateStatus, getNextPhrase, mapInstance]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  async function handleSearchMore() {
    const centre = centreRef.current;
    if (!centre || isLoadingMore) return;

    const innerKm = searchedRadiusKm;
    const outerKm = searchedRadiusKm + 20;

    setIsLoadingMore(true);
    try {
      const allCandidates = generateCandidateAreas(centre, outerKm, 3);
      const candidates = allCandidates.filter((c) =>
        haversineDistance(centre.lat, centre.lng, c.lat, c.lng) > innerKm
      );

      const BATCH_SIZE = 4;
      const areaProfiles: AreaProfile[] = [];

      for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        const batch = candidates.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.allSettled(
          batch.map(async (c) => {
            const amenities = await fetchAmenities(c.lat, c.lng);
            const distFromCentre = haversineDistance(centre.lat, centre.lng, c.lat, c.lng);

            const profile: AreaProfile = {
              id: c.id,
              name: c.name,
              coordinates: { lat: c.lat, lng: c.lng },
              amenities,
              normalizedAmenities: {},
              transport: {
                trainStationProximity: amenities.trainStation > 0 ? 1 : 0,
                busFrequency: Math.min(amenities.busStop / 10, 1),
              },
              environment: {
                type: classifyAreaType(distFromCentre),
                greenSpaceCoverage: Math.min((amenities.parksGreenSpaces || 0) / 5, 1),
              },
            };

            if (state.commute.workLocation && state.commute.commuteModes.length > 0) {
              profile.commuteEstimate = bestCommuteTime(
                c.lat,
                c.lng,
                state.commute.workLocation.lat,
                state.commute.workLocation.lng,
                state.commute.commuteModes,
              );
              profile.commuteBreakdown = commuteBreakdown(
                c.lat,
                c.lng,
                state.commute.workLocation.lat,
                state.commute.workLocation.lng,
                state.commute.commuteModes,
              );
            }

            return profile;
          })
        );

        for (const r of batchResults) {
          if (r.status === 'fulfilled') areaProfiles.push(r.value);
        }
      }

      const scored = scoreAndRankAreas(areaProfiles, state);

      const namedResults = await Promise.all(
        scored.map(async (s) => {
          try {
            const res = await fetch(
              `/api/geocode?q=${s.area.coordinates.lat},${s.area.coordinates.lng}`
            );
            const data: NominatimResult[] = await res.json();

            if (data.length > 0) {
              let name = extractAreaName(data);

              if (!name) {
                const parts = data[0].display_name.split(',');
                name = parts[0].trim();
              }

              const addressType = getMatchedAddressType(data[0].address);
              if (addressType && ['city', 'town', 'city_district'].includes(addressType)) {
                const direction = getCardinalDirection(centre, s.area.coordinates);
                if (direction) {
                  name = `${direction} ${name}`;
                }
              }

              return { ...s, area: { ...s.area, name } };
            }
          } catch {
            // Keep the generated name
          }
          return s;
        })
      );

      const label = `${innerKm}–${outerKm} km from your centre`;
      setResultRings((prev) => [...prev, { label, items: namedResults }]);
      setSearchedRadiusKm(outerKm);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleMarkerClick(index: number) {
    setActiveIndex(index);
    cardRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function handleMarkerHover(index: number | null) {
    setHoverIndex(index);
  }

  function handleCardClick(index: number) {
    setActiveIndex(index);
  }

  function handleStartOver() {
    reset();
    router.push('/');
  }

  async function handleSave() {
    await fetch('/api/survey/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state,
        label: `Survey — ${new Date().toLocaleDateString()}`,
      }),
    });
    setSaved(true);
  }

  const isLoading = transitionPhase !== 'done';
  const centre = centreRef.current ?? { lat: 53.48, lng: -2.24 };

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {isLoading && !error && (
        <LoadingProgressBar done={doneCount} total={candidates.length} />
      )}

      {isLoading && !error && candidates.length > 0 && (
        <div className="relative">
          <LoadingMap
            centre={centre}
            onMapReady={setMapInstance}
            activeCandidateIndex={activeCandidateIndex}
            candidates={candidates}
          />
          <LoadingOverlay
            areaName={currentAreaName}
            phrase={currentPhrase}
          />
        </div>
      )}

      {!isLoading && !error && (
        <div className="mx-auto max-w-5xl px-4 py-6">
          <h2 className="mb-6 text-lg text-muted-foreground">Your Results</h2>

          {allResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-lg font-medium">No matching areas found</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try adjusting your preferences to broaden the search.
                </p>
                <Button className="mt-4" onClick={() => router.push('/survey/review')}>
                  Back to Review
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <ResultMap
                results={allResults}
                activeIndex={activeIndex}
                hoverIndex={hoverIndex}
                onMarkerClick={handleMarkerClick}
                onMarkerHover={handleMarkerHover}
              />

              <div className="space-y-3">
                {resultRings.map((ring, ringIdx) => (
                  <React.Fragment key={`ring-${ringIdx}`}>
                    {ringIdx > 0 && (
                      <div className="relative flex items-center py-3">
                        <div className="flex-1 border-t border-border" />
                        <span className="mx-4 text-sm font-medium text-muted-foreground">
                          {ring.label}
                        </span>
                        <div className="flex-1 border-t border-border" />
                      </div>
                    )}

                    {ring.items.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No matching areas found in this range.
                      </p>
                    ) : (
                      ring.items.map((result, itemIdx) => {
                        const cardIndex = ringOffsets[ringIdx] + itemIdx;
                        return (
                          <React.Fragment key={result.area.id}>
                            <div ref={(el) => { cardRefs.current[cardIndex] = el; }}>
                              <ResultCard
                                result={result}
                                rank={cardIndex + 1}
                                isActive={cardIndex === activeIndex}
                                isHovered={cardIndex === hoverIndex}
                                onClick={() => handleCardClick(cardIndex)}
                                onHover={() => setHoverIndex(cardIndex)}
                                onLeave={() => setHoverIndex(null)}
                                onExplore={() => setModalArea(result)}
                              />
                            </div>
                            {(cardIndex + 1) % 3 === 0 && cardIndex < allResults.length - 1 && (
                              <AdSlot variant="inline" />
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </React.Fragment>
                ))}
              </div>

              {isLoadingMore && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-sm font-medium">
                      Searching {searchedRadiusKm}–{searchedRadiusKm + 20} km from your centre...
                    </p>
                  </CardContent>
                </Card>
              )}

              <AreaInfoModal area={modalArea} onClose={() => setModalArea(null)} />

              <div className="flex flex-col items-center gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={handleSearchMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore
                    ? `Searching ${searchedRadiusKm}–${searchedRadiusKm + 20} km...`
                    : `Search further afield (${searchedRadiusKm}–${searchedRadiusKm + 20} km)`}
                </Button>

                {session && (
                  <Button variant="outline" onClick={handleSave} disabled={saved}>
                    {saved ? 'Saved' : 'Save Results'}
                  </Button>
                )}
                <Button variant="outline" onClick={handleStartOver}>
                  Start Over
                </Button>
                <DonateButton />
              </div>

              {state.surveyMode === 'quick' && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:text-left">
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold">Want more tailored results?</p>
                      <p className="text-sm text-muted-foreground">
                        Complete the full survey to fine-tune 25+ preferences. Your quick
                        answers will carry over as a starting point.
                      </p>
                    </div>
                    <Button asChild>
                      <Link href="/survey/profile">Refine with Full Survey</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-5xl px-4 py-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg font-medium text-destructive">Error</p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <Button className="mt-4" onClick={() => router.push('/survey/review')}>
                Back to Review
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
