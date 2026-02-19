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
  publicTransport: number;
  trainStation: number;
  peaceAndQuiet: number;
  familyProximity: number;
  socialScene: number;
  commute: number;
}

export function extractWeights(state: SurveyState): ScoringWeights {
  return {
    supermarkets: normalizeLikert(state.lifestyle.supermarkets),
    highStreet: normalizeLikert(state.lifestyle.highStreet),
    pubsBars: normalizeLikert(state.lifestyle.pubsBars),
    restaurantsCafes: normalizeLikert(state.lifestyle.restaurantsCafes),
    parksGreenSpaces: normalizeLikert(state.lifestyle.parksGreenSpaces),
    gymsLeisure: normalizeLikert(state.lifestyle.gymsLeisure),
    healthcare: normalizeLikert(state.lifestyle.healthcare),
    librariesCulture: normalizeLikert(state.lifestyle.librariesCulture),
    publicTransport: normalizeLikert(state.transport.publicTransportReliance),
    trainStation: normalizeLikert(state.transport.trainStationImportance),
    peaceAndQuiet: normalizeLikert(state.environment.peaceAndQuiet),
    familyProximity: normalizeLikert(state.family.familyProximityImportance),
    socialScene: normalizeLikert(state.family.socialImportance),
    commute: state.commute.daysPerWeek / 5,
  };
}
