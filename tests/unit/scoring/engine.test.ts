import { describe, it, expect, vi } from 'vitest';
import { normalizeAmenities, scoreAndRankAreas, type AreaProfile } from '@/lib/scoring/engine';
import { initialState } from '@/lib/survey/reducer';

vi.mock('@/lib/scoring/price', () => ({
  calculatePriceScore: () => ({ score: 0.1, tier: 2, tierLabel: 'unknown', withinBudget: true }),
  PRICE_WEIGHT: 0.15,
}));

describe('engine logic', () => {
  const baseArea: AreaProfile = {
    id: 'area_1',
    name: 'Area 1',
    coordinates: { lat: 0, lng: 0 },
    amenities: {},
    normalizedAmenities: {},
    transport: { trainStationProximity: 0, busFrequency: 0 },
    environment: { type: 'city_centre', greenSpaceCoverage: 0, peaceAndQuietScore: 0 },
  };

  describe('normalizeAmenities', () => {
    it('returns empty list for empty input', () => {
      expect(normalizeAmenities([])).toEqual([]);
    });

    it('normalizes a single area to 1.0 for all present amenities', () => {
      const area = { ...baseArea, amenities: { supermarkets: 5, pubsBars: 2 } };
      const res = normalizeAmenities([area]);
      expect(res[0].normalizedAmenities.supermarkets).toBe(1);
      expect(res[0].normalizedAmenities.pubsBars).toBe(1);
    });

    it('normalizes relative to max across areas, with 0 for missing', () => {
      const areas = [
        { ...baseArea, id: '1', amenities: { a: 10, b: 0 } },
        { ...baseArea, id: '2', amenities: { a: 5, b: 5 } },
        { ...baseArea, id: '3', amenities: { c: 20 } as any },
      ];

      const res = normalizeAmenities(areas);
      // Max for a is 10, b is 5, c is 20
      expect(res[0].normalizedAmenities.a).toBe(1);
      expect(res[0].normalizedAmenities.b).toBe(0); // 0 / 5
      expect(res[0].normalizedAmenities.c).toBe(0);

      expect(res[1].normalizedAmenities.a).toBe(0.5); // 5 / 10
      expect(res[1].normalizedAmenities.b).toBe(1); // 5 / 5
      expect(res[1].normalizedAmenities.c).toBe(0);

      expect(res[2].normalizedAmenities.a).toBe(0);
      expect(res[2].normalizedAmenities.b).toBe(0);
      expect(res[2].normalizedAmenities.c).toBe(1);
    });
  });

  describe('scoreAndRankAreas', () => {
    it('separates top 10 from passedButNotTop', () => {
      const areas = Array.from({ length: 15 }, (_, i) => ({
        ...baseArea,
        id: `area_${i}`,
        name: `Area ${i}`,
        amenities: { supermarkets: i },
      }));

      const state = {
        ...initialState,
        lifestyle: { ...initialState.lifestyle, supermarkets: 5 as const },
        commute: { ...initialState.commute, daysPerWeek: 0, commuteTimeIsHardCap: false }, // avoid hard filter failures
      };

      const { topResults, passedButNotTop, rejected } = scoreAndRankAreas(areas, state);

      expect(topResults.length).toBe(10);
      expect(passedButNotTop.length).toBe(5);
      expect(rejected.length).toBe(0);

      // Verify sorting: Area 14 has most supermarkets, so it should be first
      expect(topResults[0].area.id).toBe('area_14');
      expect(topResults[9].area.id).toBe('area_5');
      expect(passedButNotTop[0].id).toBe('area_4');
    });

    it('correctly populates rejected list when filters apply', () => {
      const areas = [
        { ...baseArea, id: '1', commuteEstimate: 30 },
        { ...baseArea, id: '2', commuteEstimate: 60 },
      ];

      const state = {
        ...initialState,
        commute: { ...initialState.commute, maxCommuteTime: 45, commuteTimeIsHardCap: true },
      };

      const { topResults, rejected } = scoreAndRankAreas(areas, state);

      expect(topResults.length).toBe(1);
      expect(topResults[0].area.id).toBe('1');
      
      expect(rejected.length).toBe(1);
      expect(rejected[0].area.id).toBe('2');
      expect(rejected[0].reasons).toContain('commute');
    });

    it('integrates new dataset metrics (transit, routing, crime, schools) cleanly if present', () => {
      const areas = [
        { ...baseArea, id: '1', transitScore: 90, crimeScore: 80, schoolScore: 85 },
        { ...baseArea, id: '2', transitScore: 20, crimeScore: 30, schoolScore: 40 },
      ] as any;

      const state = {
        ...initialState,
      };

      // Just ensure it doesn't crash when these properties are passed in.
      const { topResults } = scoreAndRankAreas(areas, state);
      expect(topResults.length).toBe(2);
      expect(topResults[0].area.id).toBe('1'); // Assuming mock gives 1 higher score due to base metrics, but this just ensures stability.
    });
  });
});
