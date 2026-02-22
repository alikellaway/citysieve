import type {
  SurveyState,
  GeoLocation,
  CommuteMode,
  AreaType,
  LikertValue,
} from './types';

/**
 * Keys the user can pick as "top priorities" in the quick survey.
 * Each maps to a specific Likert field inside SurveyState.
 */
export type QuickPriorityKey =
  | 'supermarkets'
  | 'highStreet'
  | 'pubsBars'
  | 'restaurantsCafes'
  | 'parksGreenSpaces'
  | 'gymsLeisure'
  | 'healthcare'
  | 'librariesCulture'
  | 'publicTransportReliance'
  | 'trainStationImportance'
  | 'peaceAndQuiet'
  | 'familyProximityImportance'
  | 'socialImportance';

/** Display labels for each priority chip — kept in sync with HIGHLIGHT_LABELS. */
export const QUICK_PRIORITY_LABELS: Record<QuickPriorityKey, string> = {
  supermarkets: 'Supermarkets',
  highStreet: 'High street',
  pubsBars: 'Pubs & bars',
  restaurantsCafes: 'Dining out',
  parksGreenSpaces: 'Green spaces',
  gymsLeisure: 'Gyms & leisure',
  healthcare: 'Healthcare',
  librariesCulture: 'Culture',
  publicTransportReliance: 'Public transport',
  trainStationImportance: 'Train access',
  peaceAndQuiet: 'Peace & quiet',
  familyProximityImportance: 'Near family',
  socialImportance: 'Social scene',
};

export const QUICK_PRIORITY_KEYS = Object.keys(
  QUICK_PRIORITY_LABELS,
) as QuickPriorityKey[];

export interface QuickSurveyAnswers {
  workLocation: GeoLocation | null;
  /** false when user selects "fully remote" */
  isRemote: boolean;
  commuteModes: CommuteMode[];
  maxCommuteTime: number;
  areaType: AreaType | null;
  topPriorities: QuickPriorityKey[];
}

const HIGH: LikertValue = 5;
const LOW: LikertValue = 2;
const NEUTRAL: LikertValue = 3;

/**
 * Converts quick-survey answers into a complete SurveyState that the existing
 * scoring engine and results page can consume without modification.
 *
 * - Selected priorities → Likert 5
 * - Unselected priorities → Likert 2 (gently de-prioritised)
 * - Everything else → neutral defaults
 */
export function buildQuickSurveyState(
  answers: QuickSurveyAnswers,
): SurveyState {
  const sel = new Set(answers.topPriorities);

  function likert(key: QuickPriorityKey): LikertValue {
    return sel.has(key) ? HIGH : sel.size === 0 ? NEUTRAL : LOW;
  }

  return {
    surveyMode: 'quick',
    currentStep: 1,

    profile: {
      ageRange: null,
      tenureType: null,
      budget: null,
      householdType: null,
    },

    commute: {
      workLocation: answers.isRemote ? null : answers.workLocation,
      daysPerWeek: answers.isRemote ? 0 : 5,
      maxCommuteTime: answers.maxCommuteTime,
      commuteTimeIsHardCap: true,
      commuteModes: answers.commuteModes,
    },

    family: {
      householdSize: 1,
      childrenStatus: null,
      schoolPriority: null,
      familyLocation: null,
      familyProximityImportance: likert('familyProximityImportance'),
      socialImportance: likert('socialImportance'),
    },

    lifestyle: {
      supermarkets: likert('supermarkets'),
      highStreet: likert('highStreet'),
      pubsBars: likert('pubsBars'),
      restaurantsCafes: likert('restaurantsCafes'),
      parksGreenSpaces: likert('parksGreenSpaces'),
      gymsLeisure: likert('gymsLeisure'),
      healthcare: likert('healthcare'),
      librariesCulture: likert('librariesCulture'),
    },

    transport: {
      carOwnership: null,
      publicTransportReliance: likert('publicTransportReliance'),
      trainStationImportance: likert('trainStationImportance'),
      cycleFrequency: null,
      broadbandImportance: NEUTRAL,
    },

    environment: {
      areaType: answers.areaType,
      peaceAndQuiet: likert('peaceAndQuiet'),
      developmentFeeling: null,
      excludeAreas: [],
      consideringAreas: [],
    },
  };
}
