import { describe, it, expect, vi } from 'vitest';
import { calculatePriceScore, getSalePriceTier, getRentPriceTier } from '@/lib/scoring/price';
import { SALE_TIERS, RENT_TIERS } from '@/lib/scoring/price-tiers';

// Mock the imported JSON modules
vi.mock('../../../data/price-tiers/sale.json', () => ({
  default: {
    'AB1': 1,
    'AB12': 0,
    'LON': 4,
  }
}));

vi.mock('../../../data/price-tiers/rent.json', () => ({
  default: {
    'AB1': 2,
    'LON': 4,
  }
}));

describe('price logic', () => {
  describe('getSalePriceTier / getRentPriceTier', () => {
    it('returns exact outcode match', () => {
      expect(getSalePriceTier('AB12')).toBe(0);
      expect(getSalePriceTier('LON')).toBe(4);
    });

    it('returns prefix fallback if exact not found', () => {
      // LON1 starts with LON
      expect(getSalePriceTier('LON1')).toBe(4);
    });

    it('returns default tier 2 for unknown outcode', () => {
      expect(getSalePriceTier('UNKNOWN')).toBe(2);
      expect(getRentPriceTier('UNKNOWN')).toBe(2);
    });

    it('handles spacing and casing', () => {
      expect(getRentPriceTier('l o n')).toBe(4); // L O N -> LON
      expect(getSalePriceTier('ab1')).toBe(1);
    });
  });

  describe('calculatePriceScore', () => {
    it('returns neutral {score:0, withinBudget:true} if no budget or not sure', () => {
      expect(calculatePriceScore('LON', null, 'buy')).toMatchObject({ score: 0, withinBudget: true, tier: 2 });
      expect(calculatePriceScore('LON', 500000, 'not_sure')).toMatchObject({ score: 0, withinBudget: true, tier: 2 });
    });

    describe('buying', () => {
      it('returns 0.1 and withinBudget=true if areaTier <= userTier', () => {
        // userTier = budgetToSaleTierIndex(350000) -> tier 2
        // areaTier LON = 4
        // areaTier AB12 = 0
        const result = calculatePriceScore('AB12', 350000, 'buy');
        expect(result.score).toBe(0.1);
        expect(result.withinBudget).toBe(true);
        expect(result.tier).toBe(0);
        expect(result.tierLabel).toBe(SALE_TIERS[0].label);
      });

      it('returns 0 if diff == 1 (slightly over budget)', () => {
        // userTier for 200k = tier 1
        // areaTier for UNKNOWN = 2
        // diff = 2 - 1 = 1
        const result = calculatePriceScore('UNKNOWN', 200000, 'buy');
        expect(result.score).toBe(0);
        expect(result.withinBudget).toBe(false);
      });

      it('returns negative score proportional to diff if diff > 1', () => {
        // userTier for 199999 = tier 0
        // areaTier LON = 4
        // diff = 4 - 0 = 4
        // score = -0.1 * 4 = -0.4
        const result = calculatePriceScore('LON', 199999, 'buy');
        expect(result.score).toBe(-0.4);
        expect(result.withinBudget).toBe(false);
      });
    });

    describe('renting', () => {
      it('follows the same logic for renting', () => {
        // userTier for 2500 = tier 4
        // areaTier LON = 4
        // diff = 0
        const result = calculatePriceScore('LON', 2500, 'rent');
        expect(result.score).toBe(0.1);
        expect(result.withinBudget).toBe(true);
        expect(result.tier).toBe(4);
        expect(result.tierLabel).toBe(RENT_TIERS[4].label);
      });
    });
  });
});
