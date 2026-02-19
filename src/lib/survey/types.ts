export type AgeRange = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
export type TenureType = 'buy' | 'rent' | 'not_sure';
export type HouseholdType = 'alone' | 'with_partner' | 'with_family' | 'house_share';
export type CommuteMode = 'drive' | 'train' | 'bus' | 'cycle' | 'walk';
export type ChildrenStatus = 'no' | 'under_5' | 'school_age' | 'both';
export type SchoolPriority = 'primary' | 'secondary' | 'both' | 'not_important';
export type CarOwnership = 'yes' | 'no' | 'considering';
export type AreaType = 'city_centre' | 'inner_suburb' | 'outer_suburb' | 'town' | 'rural';
export type DevelopmentFeeling = 'fine_with_it' | 'prefer_established' | 'no_preference';
export type LikertValue = 1 | 2 | 3 | 4 | 5;
export type CycleFrequency = 'yes' | 'sometimes' | 'no';

export interface GeoLocation {
  label: string;
  lat: number;
  lng: number;
}

export interface ProfileStep {
  ageRange: AgeRange | null;
  tenureType: TenureType | null;
  budget: number | null;
  householdType: HouseholdType | null;
}

export interface CommuteStep {
  workLocation: GeoLocation | null;
  daysPerWeek: number;
  maxCommuteTime: number;
  commuteModes: CommuteMode[];
}

export interface FamilyStep {
  householdSize: number;
  childrenStatus: ChildrenStatus | null;
  schoolPriority: SchoolPriority | null;
  familyLocation: GeoLocation | null;
  familyProximityImportance: LikertValue;
  socialImportance: LikertValue;
}

export interface LifestyleStep {
  supermarkets: LikertValue;
  highStreet: LikertValue;
  pubsBars: LikertValue;
  restaurantsCafes: LikertValue;
  parksGreenSpaces: LikertValue;
  gymsLeisure: LikertValue;
  healthcare: LikertValue;
  librariesCulture: LikertValue;
}

export interface TransportStep {
  carOwnership: CarOwnership | null;
  publicTransportReliance: LikertValue;
  trainStationImportance: LikertValue;
  cycleFrequency: CycleFrequency | null;
  broadbandImportance: LikertValue;
}

export interface EnvironmentStep {
  areaType: AreaType | null;
  peaceAndQuiet: LikertValue;
  developmentFeeling: DevelopmentFeeling | null;
  excludeAreas: string[];
  consideringAreas: string[];
}

export interface SurveyState {
  profile: ProfileStep;
  commute: CommuteStep;
  family: FamilyStep;
  lifestyle: LifestyleStep;
  transport: TransportStep;
  environment: EnvironmentStep;
  currentStep: number;
}
