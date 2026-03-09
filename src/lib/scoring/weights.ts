import type { SurveyState, LikertValue } from '@/lib/survey/types';

export function normalizeLikert(value: LikertValue): number {
  return (value - 1) / 4;
}

export interface ScoringWeights {
  supermarkets: number;
  highStreet: number;
  pubsBars: number;
  restaurantsCafes: number;
  parksGreenSpaces: number;
  gymsLeisure: number;
  healthcare: number;
  librariesCulture: number;
  schools: number;
  publicTransport: number;
  trainStation: number;
  peaceAndQuiet: number;
  broadband: number;
  familyProximity: number;
  socialScene: number;
  commute: number;
}

export interface WeightResult {
  weights: ScoringWeights;
  /** Category keys whose weights were adjusted by profile nudges (ageRange, householdType, householdSize, carOwnership). */
  nudgedCategories: string[];
}

function schoolsWeight(state: SurveyState): number {
  const { childrenStatus, schoolPriority } = state.family;
  if (!childrenStatus || childrenStatus === 'no') return 0;
  if (schoolPriority === 'not_important') return 0.1;
  if (schoolPriority === 'both') return 0.85;
  // 'primary' or 'secondary' — single school-type priority
  return 0.7;
}

/**
 * Applies soft weight multipliers derived from profile fields that are not
 * directly represented as Likert sliders: carOwnership, ageRange,
 * householdType, and householdSize.
 *
 * Rules:
 * - Multipliers only amplify or soften existing weights; they never create
 *   importance from zero (0 × 1.15 = 0).
 * - Results are capped at 1.0.
 * - Only categories whose weight actually changed are added to nudgedCategories.
 */
function applyProfileNudges(weights: ScoringWeights, state: SurveyState): WeightResult {
  const w = { ...weights };
  const nudged = new Set<string>();

  function nudge(key: keyof ScoringWeights, factor: number) {
    const next = Math.min(1, w[key] * factor);
    if (next !== w[key]) {
      w[key] = next;
      nudged.add(key);
    }
  }

  // carOwnership → publicTransport weight modifier
  // No car = transit matters more regardless of what the user slid.
  const car = state.transport.carOwnership;
  if (car === 'no') {
    nudge('publicTransport', 1.3);
  } else if (car === 'considering') {
    nudge('publicTransport', 1.1);
  }

  // ageRange → soft lifestyle weight nudges
  const age = state.profile.ageRange;
  if (age === '18-24' || age === '25-34') {
    nudge('pubsBars', 1.15);
    nudge('gymsLeisure', 1.15);
    nudge('socialScene', 1.15);
  } else if (age === '35-44') {
    nudge('healthcare', 1.1);
  } else if (age === '45-54') {
    nudge('healthcare', 1.15);
    nudge('gymsLeisure', 1.1);
  } else if (age === '55-64' || age === '65+') {
    nudge('healthcare', 1.25);
    nudge('peaceAndQuiet', 1.15);
    nudge('pubsBars', 0.9);
  }

  // householdType → soft lifestyle weight nudges
  const ht = state.profile.householdType;
  if (ht === 'alone' || ht === 'house_share') {
    nudge('socialScene', 1.15);
    nudge('gymsLeisure', 1.1);
  } else if (ht === 'with_partner') {
    nudge('restaurantsCafes', 1.1);
  } else if (ht === 'with_family') {
    nudge('parksGreenSpaces', 1.15);
    nudge('healthcare', 1.1);
  }

  // householdSize → space-needs proxy (parks + peace)
  // Larger households need more outdoor space and tend toward quieter areas.
  const size = state.family.householdSize;
  if (size >= 5) {
    nudge('parksGreenSpaces', 1.2);
    nudge('peaceAndQuiet', 1.1);
  } else if (size >= 3) {
    nudge('parksGreenSpaces', 1.1);
  }

  return { weights: w, nudgedCategories: Array.from(nudged) };
}

export function extractWeights(state: SurveyState): WeightResult {
  const base: ScoringWeights = {
    supermarkets: normalizeLikert(state.lifestyle.supermarkets),
    highStreet: normalizeLikert(state.lifestyle.highStreet),
    pubsBars: normalizeLikert(state.lifestyle.pubsBars),
    restaurantsCafes: normalizeLikert(state.lifestyle.restaurantsCafes),
    parksGreenSpaces: normalizeLikert(state.lifestyle.parksGreenSpaces),
    gymsLeisure: normalizeLikert(state.lifestyle.gymsLeisure),
    healthcare: normalizeLikert(state.lifestyle.healthcare),
    librariesCulture: normalizeLikert(state.lifestyle.librariesCulture),
    schools: schoolsWeight(state),
    publicTransport: normalizeLikert(state.transport.publicTransportReliance),
    trainStation: normalizeLikert(state.transport.trainStationImportance),
    peaceAndQuiet: normalizeLikert(state.environment.peaceAndQuiet),
    broadband: normalizeLikert(state.transport.broadbandImportance),
    familyProximity: normalizeLikert(state.family.familyProximityImportance),
    socialScene: normalizeLikert(state.family.socialImportance),
    commute: state.commute.daysPerWeek / 5,
  };

  return applyProfileNudges(base, state);
}
