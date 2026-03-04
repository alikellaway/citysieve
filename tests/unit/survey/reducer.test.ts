import { describe, it, expect } from 'vitest';
import { surveyReducer, parseStoredState, initialState } from '@/lib/survey/reducer';
import type { SurveyAction } from '@/lib/survey/reducer';

describe('reducer logic', () => {
  describe('surveyReducer', () => {
    it('UPDATE_PROFILE merges partial payload', () => {
      const action: SurveyAction = { type: 'UPDATE_PROFILE', payload: { budget: 500000 } };
      const nextState = surveyReducer(initialState, action);
      expect(nextState.profile.budget).toBe(500000);
      expect(nextState.profile.ageRange).toBe(null); // unmodified
      expect(nextState.commute).toBe(initialState.commute); // other step untouched
    });

    it('SET_STEP updates currentStep', () => {
      const action: SurveyAction = { type: 'SET_STEP', payload: 3 };
      const nextState = surveyReducer(initialState, action);
      expect(nextState.currentStep).toBe(3);
    });

    it('RESET returns initialState', () => {
      const modifiedState = { ...initialState, currentStep: 5 };
      const nextState = surveyReducer(modifiedState, { type: 'RESET' });
      expect(nextState).toEqual(initialState);
    });

    it('LOAD_STATE replaces entire state', () => {
      const newState = { ...initialState, surveyMode: 'quick' as const };
      const nextState = surveyReducer(initialState, { type: 'LOAD_STATE', payload: newState });
      expect(nextState).toEqual(newState);
    });
  });

  describe('parseStoredState', () => {
    it('returns initialState for null', () => {
      expect(parseStoredState(null)).toEqual(initialState);
    });

    it('returns initialState for malformed JSON', () => {
      expect(parseStoredState('{ bad json }')).toEqual(initialState);
    });

    it('migrates areaType to areaTypes array', () => {
      const oldState = {
        environment: {
          areaType: 'city_centre',
          peaceAndQuiet: 5,
        }
      };
      
      const parsed = parseStoredState(JSON.stringify(oldState));
      expect(parsed.environment.areaTypes).toEqual(['city_centre']);
      expect((parsed.environment as any).areaType).toBeUndefined();
    });

    it('removes developmentFeeling', () => {
      const oldState = {
        environment: {
          developmentFeeling: 3,
        }
      };
      
      const parsed = parseStoredState(JSON.stringify(oldState));
      expect((parsed.environment as any).developmentFeeling).toBeUndefined();
    });

    it('merges missing fields with initialState', () => {
      // simulate an old stored state missing a new field like `commuteTimeIsHardCap`
      const oldState = {
        commute: {
          daysPerWeek: 3,
        }
      };
      
      const parsed = parseStoredState(JSON.stringify(oldState));
      expect(parsed.commute.daysPerWeek).toBe(3);
      expect(parsed.commute.commuteTimeIsHardCap).toBe(true); // From initialState
      expect(parsed.profile.budget).toBeNull(); // Deep merge from initialState
    });
  });
});
