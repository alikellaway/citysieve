import type { SurveyState, CommuteMode } from '@/lib/survey/types';
import { extractWeights, type ScoringWeights } from './weights';
import { applyHardFilters } from './filters';
import { bestCommuteTime } from './commute';

export interface AreaProfile {
  id: string;
  name: string;
  outcode?: string;
  coordinates: { lat: number; lng: number };
  amenities: Record<string, number>;
  normalizedAmenities: Record<string, number>;
  transport: {
    trainStationProximity: number;
    busFrequency: number;
  };
  environment: {
    type: 'city_centre' | 'inner_suburb' | 'outer_suburb' | 'town' | 'rural';
    greenSpaceCoverage: number;
  };
  commuteEstimate?: number;
  commuteBreakdown?: Partial<Record<CommuteMode, number>>;
}

export interface ScoredArea {
  area: AreaProfile;
  score: number;
  highlights: string[];
  breakdown: Record<string, number>;
  weights: ScoringWeights;
}

export function normalizeAmenities(areas: AreaProfile[]): AreaProfile[] {
  if (areas.length === 0) return areas;

  // Collect all amenity category keys
  const allKeys = new Set<string>();
  for (const area of areas) {
    for (const key of Object.keys(area.amenities)) {
      allKeys.add(key);
    }
  }

  // Find max count for each category
  const maxCounts: Record<string, number> = {};
  for (const key of allKeys) {
    maxCounts[key] = Math.max(...areas.map((a) => a.amenities[key] || 0), 1);
  }

  // Normalize each area's counts
  return areas.map((area) => {
    const normalizedAmenities: Record<string, number> = {};
    for (const key of allKeys) {
      normalizedAmenities[key] = (area.amenities[key] || 0) / maxCounts[key];
    }
    return { ...area, normalizedAmenities };
  });
}

function scoreArea(
  area: AreaProfile,
  weights: ScoringWeights,
  state: SurveyState
): ScoredArea {
  const breakdown: Record<string, number> = {};

  // Map weights to normalized area scores
  const weightEntries: [string, number, number][] = [
    ['supermarkets', weights.supermarkets, area.normalizedAmenities.supermarkets || 0],
    ['highStreet', weights.highStreet, area.normalizedAmenities.highStreet || 0],
    ['pubsBars', weights.pubsBars, area.normalizedAmenities.pubsBars || 0],
    ['restaurantsCafes', weights.restaurantsCafes, area.normalizedAmenities.restaurantsCafes || 0],
    ['parksGreenSpaces', weights.parksGreenSpaces, area.normalizedAmenities.parksGreenSpaces || 0],
    ['gymsLeisure', weights.gymsLeisure, area.normalizedAmenities.gymsLeisure || 0],
    ['healthcare', weights.healthcare, area.normalizedAmenities.healthcare || 0],
    ['librariesCulture', weights.librariesCulture, area.normalizedAmenities.librariesCulture || 0],
    ['publicTransport', weights.publicTransport, area.transport.busFrequency],
    ['trainStation', weights.trainStation, area.transport.trainStationProximity],
    ['peaceAndQuiet', weights.peaceAndQuiet, area.environment.type === 'rural' || area.environment.type === 'town' ? 0.8 : area.environment.type === 'outer_suburb' ? 0.6 : 0.3],
  ];

  // Add commute score if applicable
  if (area.commuteEstimate !== undefined && state.commute.maxCommuteTime > 0) {
    const commuteScore = Math.max(0, 1 - area.commuteEstimate / state.commute.maxCommuteTime);
    weightEntries.push(['commute', weights.commute, commuteScore]);
  }

  // Add family proximity if applicable
  if (state.family.familyLocation) {
    const familyDist = bestCommuteTime(
      area.coordinates.lat,
      area.coordinates.lng,
      state.family.familyLocation.lat,
      state.family.familyLocation.lng,
      state.commute.commuteModes.length > 0 ? state.commute.commuteModes : ['drive']
    );
    const familyScore = Math.max(0, 1 - familyDist / 120); // 120 min max
    weightEntries.push(['familyProximity', weights.familyProximity, familyScore]);
  }

  // Add social scene score based on pubs + restaurants
  const socialScore =
    ((area.normalizedAmenities.pubsBars || 0) +
      (area.normalizedAmenities.restaurantsCafes || 0)) /
    2;
  weightEntries.push(['socialScene', weights.socialScene, socialScore]);

  // Calculate weighted average
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [name, weight, areaScore] of weightEntries) {
    breakdown[name] = Math.round(areaScore * 100);
    weightedSum += weight * areaScore;
    totalWeight += weight;
  }

  const score = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

  // Generate highlights: top 3 scoring categories with non-zero weight
  const sortedCategories = weightEntries
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[2] - a[2])
    .slice(0, 3)
    .map(([name]) => name);

  return {
    area,
    score: Math.round(score * 10) / 10,
    highlights: sortedCategories,
    breakdown,
    weights,
  };
}

export function scoreAndRankAreas(
  areas: AreaProfile[],
  state: SurveyState
): ScoredArea[] {
  // 1. Normalize amenities
  const normalized = normalizeAmenities(areas);

  // 2. Apply hard filters
  const filtered = applyHardFilters(normalized, state);

  // 3. Extract weights
  const weights = extractWeights(state);

  // 4. Score each area
  const scored = filtered.map((area) => scoreArea(area, weights, state));

  // 5. Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // 6. Return top 10
  return scored.slice(0, 10);
}

export function getFilterStatus(area: AreaProfile, state: SurveyState): 'checked' | 'filtered' {
  const filtered = applyHardFilters([area], state);
  return filtered.length > 0 ? 'checked' : 'filtered';
}
