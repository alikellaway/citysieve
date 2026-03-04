import { describe, it, expect } from 'vitest';
import { budgetToSaleTierIndex, budgetToRentTierIndex } from '@/lib/scoring/price-tiers';

describe('price-tiers logic', () => {
  describe('budgetToSaleTierIndex', () => {
    // SALE_TIERS: 200k, 350k, 500k, 750k, Infinity
    it('maps correctly across all boundaries', () => {
      expect(budgetToSaleTierIndex(199999)).toBe(0);
      expect(budgetToSaleTierIndex(200000)).toBe(1); // exactly on boundary goes to next tier
      expect(budgetToSaleTierIndex(349999)).toBe(1);
      expect(budgetToSaleTierIndex(350000)).toBe(2);
      expect(budgetToSaleTierIndex(499999)).toBe(2);
      expect(budgetToSaleTierIndex(500000)).toBe(3);
      expect(budgetToSaleTierIndex(749999)).toBe(3);
      expect(budgetToSaleTierIndex(750000)).toBe(4);
      expect(budgetToSaleTierIndex(10000000)).toBe(4);
    });
  });

  describe('budgetToRentTierIndex', () => {
    // RENT_TIERS: 1000, 1500, 2000, 2500, Infinity
    it('maps correctly across all boundaries', () => {
      expect(budgetToRentTierIndex(999)).toBe(0);
      expect(budgetToRentTierIndex(1000)).toBe(1);
      expect(budgetToRentTierIndex(1499)).toBe(1);
      expect(budgetToRentTierIndex(1500)).toBe(2);
      expect(budgetToRentTierIndex(1999)).toBe(2);
      expect(budgetToRentTierIndex(2000)).toBe(3);
      expect(budgetToRentTierIndex(2499)).toBe(3);
      expect(budgetToRentTierIndex(2500)).toBe(4);
      expect(budgetToRentTierIndex(10000)).toBe(4);
    });
  });
});
