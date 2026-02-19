'use client';

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type {
  SurveyState,
  ProfileStep,
  CommuteStep,
  FamilyStep,
  LifestyleStep,
  TransportStep,
  EnvironmentStep,
} from './types';

const STORAGE_KEY = 'citysieve-survey-state';

const initialState: SurveyState = {
  profile: {
    ageRange: null,
    tenureType: null,
    budget: null,
    householdType: null,
  },
  commute: {
    workLocation: null,
    daysPerWeek: 5,
    maxCommuteTime: 45,
    commuteModes: [],
  },
  family: {
    householdSize: 1,
    childrenStatus: null,
    schoolPriority: null,
    familyLocation: null,
    familyProximityImportance: 3,
    socialImportance: 3,
  },
  lifestyle: {
    supermarkets: 3,
    highStreet: 3,
    pubsBars: 3,
    restaurantsCafes: 3,
    parksGreenSpaces: 3,
    gymsLeisure: 3,
    healthcare: 3,
    librariesCulture: 3,
  },
  transport: {
    carOwnership: null,
    publicTransportReliance: 3,
    trainStationImportance: 3,
    cycleFrequency: null,
    broadbandImportance: 3,
  },
  environment: {
    areaType: null,
    peaceAndQuiet: 3,
    greenSpaces: 3,
    developmentFeeling: null,
    excludeAreas: [],
    consideringAreas: [],
  },
  currentStep: 1,
};

type SurveyAction =
  | { type: 'UPDATE_PROFILE'; payload: Partial<ProfileStep> }
  | { type: 'UPDATE_COMMUTE'; payload: Partial<CommuteStep> }
  | { type: 'UPDATE_FAMILY'; payload: Partial<FamilyStep> }
  | { type: 'UPDATE_LIFESTYLE'; payload: Partial<LifestyleStep> }
  | { type: 'UPDATE_TRANSPORT'; payload: Partial<TransportStep> }
  | { type: 'UPDATE_ENVIRONMENT'; payload: Partial<EnvironmentStep> }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'RESET' }
  | { type: 'LOAD_STATE'; payload: SurveyState };

function surveyReducer(state: SurveyState, action: SurveyAction): SurveyState {
  switch (action.type) {
    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } };
    case 'UPDATE_COMMUTE':
      return { ...state, commute: { ...state.commute, ...action.payload } };
    case 'UPDATE_FAMILY':
      return { ...state, family: { ...state.family, ...action.payload } };
    case 'UPDATE_LIFESTYLE':
      return { ...state, lifestyle: { ...state.lifestyle, ...action.payload } };
    case 'UPDATE_TRANSPORT':
      return { ...state, transport: { ...state.transport, ...action.payload } };
    case 'UPDATE_ENVIRONMENT':
      return { ...state, environment: { ...state.environment, ...action.payload } };
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'RESET':
      return { ...initialState };
    case 'LOAD_STATE':
      return { ...action.payload };
    default:
      return state;
  }
}

interface SurveyContextValue {
  state: SurveyState;
  dispatch: React.Dispatch<SurveyAction>;
}

const SurveyContext = createContext<SurveyContextValue | null>(null);

function loadState(): SurveyState {
  if (typeof window === 'undefined') return initialState;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as SurveyState;
    }
  } catch {
    // Ignore parse errors, fall through to default
  }
  return initialState;
}

export function SurveyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(surveyReducer, initialState, loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors (e.g. quota exceeded)
    }
  }, [state]);

  return (
    <SurveyContext.Provider value={{ state, dispatch }}>
      {children}
    </SurveyContext.Provider>
  );
}

export function useSurveyContext(): SurveyContextValue {
  const context = useContext(SurveyContext);
  if (!context) {
    throw new Error('useSurveyContext must be used within a SurveyProvider');
  }
  return context;
}
