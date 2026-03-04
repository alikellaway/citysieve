import { describe, it, expect } from 'vitest';
import { applyHardFiltersWithReasons } from '@/lib/scoring/filters';
import { initialState } from '@/lib/survey/reducer';
import type { AreaProfile } from '@/lib/scoring/engine';

describe('filters logic', () => {
  const baseArea: AreaProfile = {
    id: 'area_1',
    name: 'Test Area',
    coordinates: { lat: 0, lng: 0 },
    amenities: {},
    normalizedAmenities: {},
    transport: { trainStationProximity: 0, busFrequency: 0 },
    environment: { type: 'city_centre', greenSpaceCoverage: 0 },
  };

  describe('commute filter', () => {
    it('rejects when commuteEstimate > max and commuteTimeIsHardCap=true', () => {
      const area = { ...baseArea, commuteEstimate: 60 };
      const state = {
        ...initialState,
        commute: { ...initialState.commute, maxCommuteTime: 45, commuteTimeIsHardCap: true },
      };
      
      const { passed, rejected } = applyHardFiltersWithReasons([area], state);
      expect(passed.length).toBe(0);
      expect(rejected[0].reasons).toContain('commute');
    });

    it('passes when commuteEstimate <= max', () => {
      const area = { ...baseArea, commuteEstimate: 30 };
      const state = {
        ...initialState,
        commute: { ...initialState.commute, maxCommuteTime: 45, commuteTimeIsHardCap: true },
      };
      
      const { passed, rejected } = applyHardFiltersWithReasons([area], state);
      expect(passed.length).toBe(1);
      expect(rejected.length).toBe(0);
    });

    it('passes when commuteTimeIsHardCap=false even if estimate > max', () => {
      const area = { ...baseArea, commuteEstimate: 60 };
      const state = {
        ...initialState,
        commute: { ...initialState.commute, maxCommuteTime: 45, commuteTimeIsHardCap: false },
      };
      
      const { passed } = applyHardFiltersWithReasons([area], state);
      expect(passed.length).toBe(1);
    });
  });

  describe('area type filter', () => {
    it('passes exact match or adjacent area type', () => {
      const state = {
        ...initialState,
        environment: { ...initialState.environment, areaTypes: ['inner_suburb'] as any },
      };
      
      // inner_suburb is adjacent to city_centre, inner_suburb, outer_suburb
      const passes = applyHardFiltersWithReasons([
        { ...baseArea, environment: { ...baseArea.environment, type: 'city_centre' } },
        { ...baseArea, environment: { ...baseArea.environment, type: 'inner_suburb' } },
        { ...baseArea, environment: { ...baseArea.environment, type: 'outer_suburb' } },
      ], state).passed;
      
      expect(passes.length).toBe(3);

      const rejected = applyHardFiltersWithReasons([
        { ...baseArea, environment: { ...baseArea.environment, type: 'town' } },
        { ...baseArea, environment: { ...baseArea.environment, type: 'rural' } },
      ], state).rejected;
      
      expect(rejected.length).toBe(2);
      expect(rejected[0].reasons).toContain('areaType');
      expect(rejected[1].reasons).toContain('areaType');
    });

    it('passes all if areaTypes is empty', () => {
      const state = {
        ...initialState,
        environment: { ...initialState.environment, areaTypes: [] },
      };
      const { passed } = applyHardFiltersWithReasons([
        { ...baseArea, environment: { ...baseArea.environment, type: 'rural' } },
      ], state);
      
      expect(passed.length).toBe(1);
    });
  });

  describe('excludeAreas filter', () => {
    it('rejects case-insensitive substring match', () => {
      const area = { ...baseArea, name: 'Southampton' };
      const state = {
        ...initialState,
        environment: { ...initialState.environment, excludeAreas: ['HAMPTON'] },
      };
      
      const { passed, rejected } = applyHardFiltersWithReasons([area], state);
      expect(passed.length).toBe(0);
      expect(rejected[0].reasons).toContain('excludedArea');
    });

    it('passes if no match', () => {
      const area = { ...baseArea, name: 'London' };
      const state = {
        ...initialState,
        environment: { ...initialState.environment, excludeAreas: ['HAMPTON'] },
      };
      
      const { passed } = applyHardFiltersWithReasons([area], state);
      expect(passed.length).toBe(1);
    });
  });

  it('accumulates multiple rejection reasons', () => {
    const area: AreaProfile = { 
      ...baseArea, 
      name: 'Southampton', 
      commuteEstimate: 60,
      environment: { ...baseArea.environment, type: 'rural' as const }
    };
    
    const state = {
      ...initialState,
      commute: { ...initialState.commute, maxCommuteTime: 45, commuteTimeIsHardCap: true },
      environment: { 
        ...initialState.environment, 
        excludeAreas: ['hampton'],
        areaTypes: ['city_centre'] as any
      },
    };
    
    const { rejected } = applyHardFiltersWithReasons([area], state);
    expect(rejected[0].reasons.length).toBe(3);
    expect(rejected[0].reasons).toEqual(expect.arrayContaining(['commute', 'areaType', 'excludedArea']));
  });

  it('returns empty lists for empty input', () => {
    const { passed, rejected } = applyHardFiltersWithReasons([], initialState);
    expect(passed.length).toBe(0);
    expect(rejected.length).toBe(0);
  });
});
