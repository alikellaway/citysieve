'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSurvey } from '@/hooks/useSurvey';
import { generateCandidateAreas } from '@/lib/data/area-generator';
import { bestCommuteTime } from '@/lib/scoring/commute';
import { scoreAndRankAreas, type AreaProfile, type ScoredArea } from '@/lib/scoring/engine';
import { ResultCard } from '@/components/results/ResultCard';
import { AreaInfoModal } from '@/components/results/AreaInfoModal';
import { AdSlot } from '@/components/ads/AdSlot';
import { DonateButton } from '@/components/donate/DonateButton';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

export default function ResultsPage() {
  const { state, reset } = useSurvey();
  const { data: session } = useSession();
  const router = useRouter();
  const [results, setResults] = useState<ScoredArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [modalArea, setModalArea] = useState<ScoredArea | null>(null);
  const [saved, setSaved] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasRun = useRef(false);

  const runAnalysis = useCallback(async () => {
    if (hasRun.current) return;
    hasRun.current = true;

    try {
      // Determine centre for area generation
      const centre = state.commute.workLocation ??
        state.family.familyLocation ?? { label: 'UK', lat: 53.48, lng: -2.24 };

      // Generate candidate areas in a grid around the centre
      const candidates = generateCandidateAreas(centre, 20, 3);
      setProgress({ done: 0, total: candidates.length });

      // Fetch amenities for each candidate (with concurrency limit)
      const BATCH_SIZE = 4;
      const areaProfiles: AreaProfile[] = [];

      for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        const batch = candidates.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map(async (c) => {
            const amenities = await fetchAmenities(c.lat, c.lng);
            const distFromCentre = Math.sqrt(
              Math.pow((c.lat - centre.lat) * 111, 2) +
              Math.pow((c.lng - centre.lng) * 111 * Math.cos((centre.lat * Math.PI) / 180), 2)
            );

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

            // Add commute estimate if work location is set
            if (state.commute.workLocation && state.commute.commuteModes.length > 0) {
              profile.commuteEstimate = bestCommuteTime(
                c.lat,
                c.lng,
                state.commute.workLocation.lat,
                state.commute.workLocation.lng,
                state.commute.commuteModes
              );
            }

            return profile;
          })
        );

        for (const r of batchResults) {
          if (r.status === 'fulfilled') areaProfiles.push(r.value);
        }
        setProgress((p) => ({ ...p, done: Math.min(i + BATCH_SIZE, candidates.length) }));
      }

      // Reverse-geocode names for the top candidates (use coordinates-based naming)
      // Score and rank
      const scored = scoreAndRankAreas(areaProfiles, state);

      // Try to get readable names via reverse geocoding for top results
      const namedResults = await Promise.all(
        scored.map(async (s) => {
          try {
            const res = await fetch(
              `/api/geocode?q=${s.area.coordinates.lat},${s.area.coordinates.lng}`
            );
            const data = await res.json();
            if (data.length > 0) {
              const parts = data[0].display_name.split(',');
              const name = parts.slice(0, 2).map((p: string) => p.trim()).join(', ');
              return { ...s, area: { ...s.area, name } };
            }
          } catch {
            // Keep original name
          }
          return s;
        })
      );

      setResults(namedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [state]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  function handleMarkerClick(index: number) {
    setActiveIndex(index);
    cardRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-lg font-medium">Analysing areas...</p>
            {progress.total > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Checked {progress.done} of {progress.total} areas
              </p>
            )}
          </CardContent>
        </Card>
      )}

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

      {!loading && !error && results.length === 0 && (
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

      {!loading && !error && results.length > 0 && (
        <div className="space-y-6">
          {/* Map */}
          <ResultMap
            results={results}
            activeIndex={activeIndex}
            onMarkerClick={handleMarkerClick}
          />

          {/* Result Cards */}
          <div className="space-y-3">
            {results.map((result, i) => (
              <React.Fragment key={result.area.id}>
                <div ref={(el) => { cardRefs.current[i] = el; }}>
                  <ResultCard
                    result={result}
                    rank={i + 1}
                    isActive={i === activeIndex}
                    onClick={() => handleCardClick(i)}
                    onExplore={() => setModalArea(result)}
                  />
                </div>
                {(i + 1) % 3 === 0 && i < results.length - 1 && (
                  <AdSlot size="banner" />
                )}
              </React.Fragment>
            ))}
          </div>

          <AreaInfoModal area={modalArea} onClose={() => setModalArea(null)} />

          <div className="flex flex-col items-center gap-4 pt-4">
            {session && (
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={saved}
              >
                {saved ? 'Saved' : 'Save Results'}
              </Button>
            )}
            <Button variant="outline" onClick={handleStartOver}>
              Start Over
            </Button>
            <DonateButton />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
