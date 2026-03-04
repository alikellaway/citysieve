'use client';

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { SurveyState } from './types';
import { initialState, surveyReducer, parseStoredState, type SurveyAction } from './reducer';

const STORAGE_KEY = 'citysieve-survey-state';

interface SurveyContextValue {
  state: SurveyState;
  dispatch: React.Dispatch<SurveyAction>;
}

const SurveyContext = createContext<SurveyContextValue | null>(null);

function loadState(): SurveyState {
  if (typeof window === 'undefined') return initialState;
  return parseStoredState(localStorage.getItem(STORAGE_KEY));
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
