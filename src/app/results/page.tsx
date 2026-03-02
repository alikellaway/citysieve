'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSurvey } from '@/hooks/useSurvey';
import { generateCandidateAreas, type CandidateArea } from '@/lib/data/area-generator';
import { getPostcodeDistrict, filterValidCandidates } from '@/lib/data/postcode';
import { bestCommuteTime, commuteBreakdown, haversineDistance } from '@/lib/scoring/commute';
import { scoreAndRankAreas, getFilterStatus, type AreaProfile, type ScoredArea, type ScoringResult } from '@/lib/scoring/engine';
import { ResultCard } from '@/components/results/ResultCard';
import { AreaInfoModal } from '@/components/results/AreaInfoModal';
import { FilterBreakdown } from '@/components/results/FilterBreakdown';
import type { CandidateStatus } from '@/components/results/LoadingMap';
import { LoadingOverlay } from '@/components/results/LoadingOverlay';
import { LoadingProgressBar } from '@/components/results/LoadingProgressBar';
import { AdSlot } from '@/components/ads/AdSlot';
import { formatMinutes } from '@/lib/format-duration';
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

/**
 * Generates candidate areas for a given centre and radius, using a smart density
 * adjustment to compensate when a large portion of the grid falls over the sea.
 *
 * Strategy:
 * 1. Generate a standard 3km-spaced grid and filter non-UK-land points.
 * 2. If fewer than 100 valid points remain (≥37% lost to sea), the land ratio is
 *    used to calculate a denser spacing: newSpacing = 3 * sqrt(landRatio).
 *    This is bounded to [1.8, 2.5] km to avoid overloading Overpass / postcodes.io.
 * 3. Regenerate and re-filter with the denser spacing.
 */
async function generateValidCandidates(
  centre: GeoLocation,
  radiusKm: number
): Promise<import('@/lib/data/area-generator').CandidateArea[]> {
  const STANDARD_SPACING = 3;
  const MINIMUM_ACCEPTABLE = 100;

  const rawCandidates = generateCandidateAreas(centre, radiusKm, STANDARD_SPACING);
  const validCandidates = await filterValidCandidates(rawCandidates);

  if (validCandidates.length >= MINIMUM_ACCEPTABLE) {
    return validCandidates;
  }

  // Too many points lost to the sea — increase density proportionally.
  const landRatio = rawCandidates.length > 0
    ? validCandidates.length / rawCandidates.length
    : 1;
  const rawSpacing = STANDARD_SPACING * Math.sqrt(landRatio);
  const denseSpacing = Math.max(1.8, Math.min(rawSpacing, 2.5));

  const denseCandidates = generateCandidateAreas(centre, radiusKm, denseSpacing);
  return filterValidCandidates(denseCandidates);
}

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
  const [mapCentre, setMapCentre] = useState<{ lat: number; lng: number } | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);

  const [viableCount, setViableCount] = useState(0);
  const [isSkipping, setIsSkipping] = useState(false);

  // Expand search state
  const [expandCandidates, setExpandCandidates] = useState<CandidateArea[]>([]);
  const [expandCandidateStatus, setExpandCandidateStatus] = useState<Map<string, CandidateStatus>>(new Map());
  const [expandDoneCount, setExpandDoneCount] = useState(0);
  const [expandCurrentAreaName, setExpandCurrentAreaName] = useState<string | null>(null);
  const [expandCurrentPhrase, setExpandCurrentPhrase] = useState('');

  // Filter breakdown state
  const [rejectedAreas, setRejectedAreas] = useState<ScoringResult['rejected']>([]);
  const [passedButNotTop, setPassedButNotTop] = useState<AreaProfile[]>([]);

  const centreRef = useRef<GeoLocation | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasRun = useRef(false);
  const phraseIndexRef = useRef(0);
  const skipRequestedRef = useRef(false);

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
      setMapCentre({ lat: centre.lat, lng: centre.lng });
      setIsFiltering(true);
      setCurrentPhrase('Finding land areas...');

      const baseCandidates = await generateValidCandidates(centre, 20);

      // Inject extra candidate points near any areas the user is considering.
      // For each named area, geocode it and generate a small supplementary hex
      // grid (5 km radius, 2 km spacing). Points that overlap the base grid are
      // deduplicated by id so no area is fetched twice.
      let allCandidates = baseCandidates;
      if (state.environment.consideringAreas.length > 0) {
        const existingIds = new Set(baseCandidates.map((c) => c.id));
        const extras: CandidateArea[] = [];

        await Promise.allSettled(
          state.environment.consideringAreas.map(async (areaName) => {
            try {
              const res = await fetch(
                `/api/geocode?q=${encodeURIComponent(areaName)}&countrycodes=gb`
              );
              const data = await res.json();
              if (!Array.isArray(data) || data.length === 0) return;
              const geocodedLoc = {
                label: areaName,
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
              };
              if (isNaN(geocodedLoc.lat) || isNaN(geocodedLoc.lng)) return;

              const supplementary = generateCandidateAreas(geocodedLoc, 5, 2);
              const validSupplementary = await filterValidCandidates(supplementary);
              for (const c of validSupplementary) {
                if (!existingIds.has(c.id)) {
                  existingIds.add(c.id);
                  extras.push(c);
                }
              }
            } catch {
              // Skip areas that fail to geocode
            }
          })
        );

        allCandidates = [...baseCandidates, ...extras];
      }

      setIsFiltering(false);
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
        if (skipRequestedRef.current) break;

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

        let batchViable = 0;
        for (const r of batchResults) {
          if (r.status === 'fulfilled') {
            areaProfiles.push(r.value.profile);
            profileMap.set(r.value.candidateId, r.value.profile);
            if (getFilterStatus(r.value.profile, state) === 'checked') {
              batchViable++;
            }
          }
        }
        if (batchViable > 0) {
          setViableCount(prev => prev + batchViable);
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

      const { topResults, rejected, passedButNotTop } = scoreAndRankAreas(areaProfiles, state);
      setRejectedAreas(rejected);
      setPassedButNotTop(passedButNotTop);

      const namedResults = await Promise.all(
        topResults.map(async (s) => {
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

      // --- Fire Analytics Background Fetch ---
      fetch('/api/analytics/survey-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyMode: state.surveyMode,
          surveyState: state,
          topResults: namedResults.map((r) => ({
            name: r.area.name,
            outcode: r.area.outcode,
            score: r.score,
            coordinates: r.area.coordinates,
            highlights: r.highlights,
            commuteEstimate: r.area.commuteEstimate,
          })),
          totalCandidates: allCandidates.length,
          rejectedCount: rejected.length,
          passedCount: passedButNotTop.length,
          radiusKm: 20,
        }),
      }).catch(console.error); // Fire and forget
      // ---------------------------------------
    } catch (err) {
      setIsFiltering(false);
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
    setExpandDoneCount(0);
    setExpandCurrentPhrase(`Scanning ${innerKm}–${outerKm} km ring...`);
    try {
      const STANDARD_SPACING = 3;
      const MINIMUM_ACCEPTABLE = 100;

      const ringFilter = (cs: import('@/lib/data/area-generator').CandidateArea[]) =>
        cs.filter((c) => haversineDistance(centre.lat, centre.lng, c.lat, c.lng) > innerKm);

      const rawRing = ringFilter(generateCandidateAreas(centre, outerKm, STANDARD_SPACING));
      let candidates = await filterValidCandidates(rawRing);

      if (candidates.length < MINIMUM_ACCEPTABLE) {
        const landRatio = rawRing.length > 0 ? candidates.length / rawRing.length : 1;
        const denseSpacing = Math.max(1.8, Math.min(STANDARD_SPACING * Math.sqrt(landRatio), 2.5));
        const denseRing = ringFilter(generateCandidateAreas(centre, outerKm, denseSpacing));
        candidates = await filterValidCandidates(denseRing);
      }

      setExpandCandidates(candidates);
      const initialStatus = new Map<string, CandidateStatus>();
      candidates.forEach(c => initialStatus.set(c.id, 'pending'));
      setExpandCandidateStatus(initialStatus);

      const BATCH_SIZE = 4;
      const areaProfiles: AreaProfile[] = [];

      for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        const batch = candidates.slice(i, i + BATCH_SIZE);

        setExpandCandidateStatus(prev => {
          const newStatus = new Map(prev);
          batch.forEach(c => newStatus.set(c.id, 'checking'));
          return newStatus;
        });

        fetch(`/api/geocode?q=${batch[0].lat},${batch[0].lng}`)
          .then((r) => r.json())
          .then((data: NominatimResult[]) => {
            if (Array.isArray(data) && data.length > 0) {
              const name = extractAreaName(data) || data[0].display_name.split(',')[0].trim();
              setExpandCurrentAreaName(name);
              setExpandCurrentPhrase(getNextPhrase());
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

        setExpandCandidateStatus(prev => {
          const newStatus = new Map(prev);
          batch.forEach(c => newStatus.set(c.id, 'checked'));
          return newStatus;
        });
        setExpandDoneCount((i + BATCH_SIZE));
      }

      const { topResults, rejected, passedButNotTop } = scoreAndRankAreas(areaProfiles, state);
      setRejectedAreas(rejected);
      setPassedButNotTop(passedButNotTop);

      const namedResults = await Promise.all(
        topResults.map(async (s) => {
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
      setExpandCandidates([]);
      setExpandCandidateStatus(new Map());
      setExpandDoneCount(0);
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

  function handleSkip() {
    skipRequestedRef.current = true;
    setIsSkipping(true);
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
  const isSearchingMore = isLoadingMore;
  const centre = mapCentre ?? { lat: 53.48, lng: -2.24 };

  // Determine which candidates/progress to show based on search phase
  const displayCandidates = isSearchingMore ? expandCandidates : candidates;
  const displayDoneCount = isSearchingMore ? expandDoneCount : doneCount;
  const displayCurrentAreaName = isSearchingMore ? expandCurrentAreaName : currentAreaName;
  const displayCurrentPhrase = isSearchingMore ? expandCurrentPhrase : currentPhrase;
  const displayIsFiltering = isSearchingMore ? false : isFiltering;

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {(isLoading || isSearchingMore) && !error && (
        <LoadingProgressBar
          done={displayDoneCount}
          total={displayCandidates.length}
          indeterminate={displayIsFiltering}
        />
      )}

      {(isLoading || isSearchingMore) && mapCentre && (
        <div className="relative">
          <LoadingMap
            centre={centre}
            onMapReady={setMapInstance}
            candidates={displayCandidates}
            activeCandidateIndex={activeCandidateIndex}
            candidateStatus={candidateStatus}
          />
          <LoadingOverlay
            areaName={displayIsFiltering ? null : displayCurrentAreaName}
            phrase={displayCurrentPhrase}
            viableCount={viableCount}
            doneCount={displayDoneCount}
            totalCount={displayCandidates.length}
            isSkipping={isSkipping}
            onSkip={handleSkip}
          />
        </div>
      )}

      {!isLoading && !isSearchingMore && !error && (
        <div className="mx-auto max-w-5xl px-4 py-6">
          <h2 className="mb-6 text-lg text-muted-foreground">Your Results</h2>

          {allResults.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="mb-6 flex justify-center w-full">
                  <Image 
                    src="/illustration-mono-light.png" 
                    alt="No matches found" 
                    width={200} 
                    height={266} 
                    className="h-32 md:h-48 w-auto object-contain dark:hidden opacity-80"
                  />
                  <Image 
                    src="/illustration-mono-dark.png" 
                    alt="No matches found" 
                    width={200} 
                    height={266} 
                    className="h-32 md:h-48 w-auto object-contain hidden dark:block opacity-80"
                  />
                </div>
                <div className="text-center mb-6 max-w-md mx-auto">
                  <p className="text-xl font-medium">No matching areas found</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We sifted through the whole city but couldn&apos;t find a perfect match. Your filters rejected all checked areas. Here&apos;s what happened:
                  </p>
                </div>

                <div className="space-y-4 mb-6 max-h-80 overflow-y-auto">
                  {state.commute.commuteTimeIsHardCap && rejectedAreas.some(r => r.reasons.includes('commute')) && (
                    <FilterBreakdown
                      title="Commute time"
                      description={`Over ${formatMinutes(state.commute.maxCommuteTime)}`}
                      areas={rejectedAreas.filter(r => r.reasons.includes('commute')).map(r => r.area)}
                      defaultOpen={true}
                    />
                  )}

                  {state.environment.areaTypes.length > 0 && rejectedAreas.some(r => r.reasons.includes('areaType')) && (
                    <FilterBreakdown
                      title="Area type"
                      description={`Not in: ${state.environment.areaTypes.join(', ')}`}
                      areas={rejectedAreas.filter(r => r.reasons.includes('areaType')).map(r => r.area)}
                    />
                  )}

                  {state.environment.excludeAreas.length > 0 && rejectedAreas.some(r => r.reasons.includes('excludedArea')) && (
                    <FilterBreakdown
                      title="Excluded areas"
                      description={`You excluded: ${state.environment.excludeAreas.join(', ')}`}
                      areas={rejectedAreas.filter(r => r.reasons.includes('excludedArea')).map(r => r.area)}
                    />
                  )}
                </div>

                <div className="text-center text-sm text-muted-foreground mb-6">
                  <p>Try adjusting these filters or widening your search radius.</p>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <Button onClick={handleSearchMore} disabled={isLoadingMore}>
                    {isLoadingMore
                      ? `Searching ${searchedRadiusKm}–${searchedRadiusKm + 20} km...`
                      : "Search a wider area"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Searches up to {searchedRadiusKm + 20} km from your centre
                  </p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(state.surveyMode === 'quick' ? '/quick-survey' : '/survey/review')
                    }
                  >
                    Back to survey
                  </Button>
                </div>
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
                disabled={isLoading}
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
                            {(cardIndex + 1) % 3 === 0 &&
                              cardIndex < allResults.length - 1 &&
                              itemIdx < ring.items.length - 1 && (
                              <AdSlot variant="inline" />
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </React.Fragment>
                ))}
              </div>

              <AreaInfoModal area={modalArea} onClose={() => setModalArea(null)} />

              <div className="flex justify-center py-2">
                <AdSlot variant="rectangle" />
              </div>

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
              <Button
                className="mt-4"
                onClick={() =>
                  router.push(state.surveyMode === 'quick' ? '/quick-survey' : '/survey/review')
                }
              >
                {state.surveyMode === 'quick' ? 'Back to Survey' : 'Back to Review'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
