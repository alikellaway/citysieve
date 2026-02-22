'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSurvey } from '@/hooks/useSurvey';
import { generateCandidateAreas } from '@/lib/data/area-generator';
import { bestCommuteTime, commuteBreakdown, haversineDistance } from '@/lib/scoring/commute';
import { scoreAndRankAreas, type AreaProfile, type ScoredArea } from '@/lib/scoring/engine';
import { ResultCard } from '@/components/results/ResultCard';
import { AreaInfoModal } from '@/components/results/AreaInfoModal';
import { AdSlot } from '@/components/ads/AdSlot';
import { DonateButton } from '@/components/donate/DonateButton';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { GeoLocation } from '@/lib/survey/types';

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

const ResultMap = dynamic(
  () => import('@/components/results/ResultMap').then((m) => m.ResultMap),
  { ssr: false, loading: () => <div className="h-[400px] w-full animate-pulse rounded-lg bg-muted" /> }
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

interface ProgressState {
  done: number;
  total: number;
  currentName: string;
}

interface ResultRing {
  label: string;
  items: ScoredArea[];
}

/** Progress bar shared between initial load and "search for more" */
function ProgressBar({ progress }: { progress: ProgressState }) {
  return (
    <div className="mx-auto max-w-xs space-y-2">
      <div className="relative">
        <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 dark:from-indigo-400 dark:to-violet-400 transition-[width] duration-700 ease-out"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
        {progress.done > 0 && progress.done < progress.total && (
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 dark:bg-violet-400 shadow-[0_0_10px_4px_rgba(139,92,246,0.55)] dark:shadow-[0_0_10px_4px_rgba(167,139,250,0.6)] transition-[left] duration-700 ease-out"
            style={{ left: `${(progress.done / progress.total) * 100}%` }}
          />
        )}
      </div>
      <p className="text-right text-xs tabular-nums text-muted-foreground">
        {Math.round((progress.done / progress.total) * 100)}%
      </p>
    </div>
  );
}

export default function ResultsPage() {
  const { state, reset } = useSurvey();
  const { data: session } = useSession();
  const router = useRouter();

  const [resultRings, setResultRings] = useState<ResultRing[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressState>({ done: 0, total: 0, currentName: '' });
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [modalArea, setModalArea] = useState<ScoredArea | null>(null);
  const [saved, setSaved] = useState(false);
  const [searchedRadiusKm, setSearchedRadiusKm] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moreProgress, setMoreProgress] = useState<ProgressState>({ done: 0, total: 0, currentName: '' });

  const centreRef = useRef<GeoLocation | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasRun = useRef(false);

  // Derive flat list of all results across all rings (for map + card refs)
  const allResults = resultRings.flatMap((r) => r.items);

  // Pre-compute the global starting index for each ring
  const ringOffsets = resultRings.reduce<number[]>((acc, _, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + resultRings[i - 1].items.length);
    return acc;
  }, []);

  /**
   * Fetches and scores areas in the ring between innerKm and outerKm from centre.
   * Pass innerKm=0 for the initial 0–outerKm search (no inner-ring filtering).
   */
  const fetchRingResults = useCallback(async (
    centre: GeoLocation,
    innerKm: number,
    outerKm: number,
    setProgressFn: React.Dispatch<React.SetStateAction<ProgressState>>,
  ): Promise<ScoredArea[]> => {
    const allCandidates = generateCandidateAreas(centre, outerKm, 3);

    // For an expanded ring, keep only candidates beyond the already-searched radius
    const candidates = innerKm === 0
      ? allCandidates
      : allCandidates.filter((c) =>
          haversineDistance(centre.lat, centre.lng, c.lat, c.lng) > innerKm
        );

    setProgressFn({ done: 0, total: candidates.length, currentName: '' });

    const BATCH_SIZE = 4;
    const areaProfiles: AreaProfile[] = [];

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);

      // Non-blocking: grab a readable name for the progress display
      fetch(`/api/geocode?q=${batch[0].lat},${batch[0].lng}`)
        .then((r) => r.json())
        .then((data: NominatimResult[]) => {
          if (Array.isArray(data) && data.length > 0) {
            const name = extractAreaName(data) || data[0].display_name.split(',')[0].trim();
            setProgressFn((p) => ({ ...p, currentName: name }));
          }
        })
        .catch(() => {});

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
      setProgressFn((p) => ({ ...p, done: Math.min(i + BATCH_SIZE, candidates.length) }));
    }

    const scored = scoreAndRankAreas(areaProfiles, state);

    // Reverse-geocode readable names for the top results
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

    return namedResults;
  }, [state]);

  const runAnalysis = useCallback(async () => {
    if (hasRun.current) return;
    hasRun.current = true;

    try {
      const centre = state.commute.workLocation ??
        state.family.familyLocation ??
        { label: 'UK', lat: 53.48, lng: -2.24 };

      centreRef.current = centre;

      const items = await fetchRingResults(centre, 0, 20, setProgress);
      setResultRings([{ label: 'Within 20 km', items }]);
      setSearchedRadiusKm(20);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [fetchRingResults, state]);

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
      const items = await fetchRingResults(centre, innerKm, outerKm, setMoreProgress);
      const label = `${innerKm}–${outerKm} km from your centre`;
      setResultRings((prev) => [...prev, { label, items }]);
      setSearchedRadiusKm(outerKm);
    } finally {
      setIsLoadingMore(false);
      setMoreProgress({ done: 0, total: 0, currentName: '' });
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

  return (
    <div>
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="mb-6 text-lg text-muted-foreground">Your Results</h2>

        {/* ── Initial loading ── */}
        {loading && (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-xl font-semibold tracking-tight">Finding your ideal areas</p>
              <p className="mt-1.5 mb-10 h-5 text-sm text-muted-foreground">
                {progress.currentName
                  ? `Checking ${progress.currentName}`
                  : progress.total > 0
                  ? 'Starting\u2026'
                  : ''}
              </p>
              {progress.total > 0 && <ProgressBar progress={progress} />}
            </CardContent>
          </Card>
        )}

        {/* ── Error ── */}
        {error && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg font-medium text-destructive">Error</p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <Button className="mt-4" onClick={() => router.push('/survey/review')}>
                Back to Review
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── No results ── */}
        {!loading && !error && allResults.length === 0 && (
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
        )}

        {/* ── Results ── */}
        {!loading && !error && allResults.length > 0 && (
          <div className="space-y-6">
            {/* Map — shows all results across all rings */}
            <ResultMap
              results={allResults}
              activeIndex={activeIndex}
              hoverIndex={hoverIndex}
              onMarkerClick={handleMarkerClick}
              onMarkerHover={handleMarkerHover}
            />

            {/* Result cards, grouped by ring */}
            <div className="space-y-3">
              {resultRings.map((ring, ringIdx) => (
                <React.Fragment key={`ring-${ringIdx}`}>
                  {/* Divider label for every ring after the first */}
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
                            <AdSlot size="banner" />
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* "Search for more" loading indicator */}
            {isLoadingMore && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm font-medium">
                    Searching {searchedRadiusKm}–{searchedRadiusKm + 20} km from your centre
                  </p>
                  <p className="mt-1 mb-6 h-4 text-xs text-muted-foreground">
                    {moreProgress.currentName
                      ? `Checking ${moreProgress.currentName}`
                      : 'Starting\u2026'}
                  </p>
                  {moreProgress.total > 0 && <ProgressBar progress={moreProgress} />}
                </CardContent>
              </Card>
            )}

            <AreaInfoModal area={modalArea} onClose={() => setModalArea(null)} />

            {/* Action buttons */}
            <div className="flex flex-col items-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={handleSearchMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore
                  ? `Searching ${searchedRadiusKm}–${searchedRadiusKm + 20} km\u2026`
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

            {/* Upgrade prompt — shown only after the quick survey */}
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
    </div>
  );
}
