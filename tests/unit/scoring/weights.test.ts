import { describe, it, expect } from 'vitest';
import { normalizeLikert, extractWeights } from '@/lib/scoring/weights';
import { initialState } from '@/lib/survey/reducer';
import type { SurveyState } from '@/lib/survey/types';

describe('weights logic', () => {
  describe('normalizeLikert', () => {
    it('maps 1 to 0', () => expect(normalizeLikert(1)).toBe(0));
    it('maps 3 to 0.5', () => expect(normalizeLikert(3)).toBe(0.5));
    it('maps 5 to 1', () => expect(normalizeLikert(5)).toBe(1));
  });

  describe('extractWeights', () => {
    it('handles school weight based on childrenStatus and schoolPriority', () => {
      const stateNoChildren: SurveyState = {
        ...initialState,
        family: { ...initialState.family, childrenStatus: 'no' }
      };
      expect(extractWeights(stateNoChildren).schools).toBe(0);

      const stateNotImportant: SurveyState = {
        ...initialState,
        family: { ...initialState.family, childrenStatus: 'school_age', schoolPriority: 'not_important' }
      };
      expect(extractWeights(stateNotImportant).schools).toBe(0.1);

      const stateImportant: SurveyState = {
        ...initialState,
        family: { ...initialState.family, childrenStatus: 'school_age', schoolPriority: 'primary' }
      };
      expect(extractWeights(stateImportant).schools).toBe(0.75);
    });

    it('handles commute weight based on daysPerWeek', () => {
      const state5Days = { ...initialState, commute: { ...initialState.commute, daysPerWeek: 5 } };
      expect(extractWeights(state5Days).commute).toBe(1.0);

      const state3Days = { ...initialState, commute: { ...initialState.commute, daysPerWeek: 3 } };
      expect(extractWeights(state3Days).commute).toBe(0.6);

      const state0Days = { ...initialState, commute: { ...initialState.commute, daysPerWeek: 0 } };
      expect(extractWeights(state0Days).commute).toBe(0);
    });

    it('extracts all likert weights correctly', () => {
      const testState: SurveyState = {
        ...initialState,
        lifestyle: {
          supermarkets: 5,
          highStreet: 4,
          pubsBars: 3,
          restaurantsCafes: 2,
          parksGreenSpaces: 1,
          gymsLeisure: 5,
          healthcare: 5,
          librariesCulture: 1,
        },
        transport: {
          ...initialState.transport,
          publicTransportReliance: 4,
          trainStationImportance: 5,
          broadbandImportance: 2,
        },
        environment: {
          ...initialState.environment,
          peaceAndQuiet: 3,
        },
        family: {
          ...initialState.family,
          familyProximityImportance: 1,
          socialImportance: 5,
        }
      };

      const weights = extractWeights(testState);
      expect(weights).toMatchObject({
        supermarkets: 1,
        highStreet: 0.75,
        pubsBars: 0.5,
        restaurantsCafes: 0.25,
        parksGreenSpaces: 0,
        gymsLeisure: 1,
        healthcare: 1,
        librariesCulture: 0,
        publicTransport: 0.75,
        trainStation: 1,
        peaceAndQuiet: 0.5,
        broadband: 0.25,
        familyProximity: 0,
        socialScene: 1,
      });
    });
  });
});
