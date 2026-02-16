'use client';

import { useCallback } from 'react';
import { useSurveyContext } from '@/lib/survey/context';
import type {
  SurveyState,
  ProfileStep,
  CommuteStep,
  FamilyStep,
  LifestyleStep,
  TransportStep,
  EnvironmentStep,
} from '@/lib/survey/types';

export function useSurvey() {
  const { state, dispatch } = useSurveyContext();

  const updateProfile = useCallback(
    (data: Partial<ProfileStep>) => dispatch({ type: 'UPDATE_PROFILE', payload: data }),
    [dispatch]
  );

  const updateCommute = useCallback(
    (data: Partial<CommuteStep>) => dispatch({ type: 'UPDATE_COMMUTE', payload: data }),
    [dispatch]
  );

  const updateFamily = useCallback(
    (data: Partial<FamilyStep>) => dispatch({ type: 'UPDATE_FAMILY', payload: data }),
    [dispatch]
  );

  const updateLifestyle = useCallback(
    (data: Partial<LifestyleStep>) => dispatch({ type: 'UPDATE_LIFESTYLE', payload: data }),
    [dispatch]
  );

  const updateTransport = useCallback(
    (data: Partial<TransportStep>) => dispatch({ type: 'UPDATE_TRANSPORT', payload: data }),
    [dispatch]
  );

  const updateEnvironment = useCallback(
    (data: Partial<EnvironmentStep>) => dispatch({ type: 'UPDATE_ENVIRONMENT', payload: data }),
    [dispatch]
  );

  const setStep = useCallback(
    (step: number) => dispatch({ type: 'SET_STEP', payload: step }),
    [dispatch]
  );

  const reset = useCallback(
    () => dispatch({ type: 'RESET' }),
    [dispatch]
  );

  const loadState = useCallback(
    (fullState: SurveyState) => dispatch({ type: 'LOAD_STATE', payload: fullState }),
    [dispatch]
  );

  return {
    state,
    updateProfile,
    updateCommute,
    updateFamily,
    updateLifestyle,
    updateTransport,
    updateEnvironment,
    setStep,
    reset,
    loadState,
  };
}
