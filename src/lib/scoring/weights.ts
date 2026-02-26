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

function schoolsWeight(state: SurveyState): number {
  const { childrenStatus, schoolPriority } = state.family;
  if (!childrenStatus || childrenStatus === 'no') return 0;
  if (schoolPriority === 'not_important') return 0.1;
  return 0.75;
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
    schools: schoolsWeight(state),
    publicTransport: normalizeLikert(state.transport.publicTransportReliance),
    trainStation: normalizeLikert(state.transport.trainStationImportance),
    peaceAndQuiet: normalizeLikert(state.environment.peaceAndQuiet),
    broadband: normalizeLikert(state.transport.broadbandImportance),
    familyProximity: normalizeLikert(state.family.familyProximityImportance),
    socialScene: normalizeLikert(state.family.socialImportance),
    commute: state.commute.daysPerWeek / 5,
  };
}
