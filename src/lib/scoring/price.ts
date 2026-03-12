import { SALE_TIERS, RENT_TIERS, budgetToSaleTierIndex, budgetToRentTierIndex } from './price-tiers';
import saleData from '../../../data/price-tiers/sale.json';
import rentData from '../../../data/price-tiers/rent.json';

type PriceTierData = Record<string, number>;

export function getSalePriceTier(outcode: string): number {
  const normalizedOutcode = outcode.toUpperCase();
  
  if ((saleData as PriceTierData)[normalizedOutcode] !== undefined) {
    return (saleData as PriceTierData)[normalizedOutcode];
  }
  
  for (const key of Object.keys(saleData)) {
    if (normalizedOutcode.startsWith(key)) {
      return (saleData as PriceTierData)[key];
    }
  }
  
  return 2;
}

export function getRentPriceTier(postcodePrefix: string): number {
  const normalized = postcodePrefix.toUpperCase().replace(/\s/g, '');
  
  if ((rentData as PriceTierData)[normalized] !== undefined) {
    return (rentData as PriceTierData)[normalized];
  }
  
  for (const key of Object.keys(rentData)) {
    if (normalized.startsWith(key)) {
      return (rentData as PriceTierData)[key];
    }
  }
  
  return 2;
}

export interface PriceScoreResult {
  score: number;
  tier: number;
  tierLabel: string;
  withinBudget: boolean;
}

export function calculatePriceScore(
  outcode: string | undefined,
  budget: number | null,
  tenure: 'buy' | 'rent' | 'not_sure' | null
): PriceScoreResult {
  if (!budget || !tenure || tenure === 'not_sure') {
    return { score: 0, tier: 2, tierLabel: 'unknown', withinBudget: true };
  }

  const isBuying = tenure === 'buy';

  if (isBuying) {
    const areaTier = outcode ? getSalePriceTier(outcode) : 2;
    const userTier = budgetToSaleTierIndex(budget);
    const tierLabel = SALE_TIERS[areaTier]?.label ?? 'unknown';
    
    const diff = areaTier - userTier;
    let score = 0;
    
    if (diff <= 0) {
      score = 0.1;
    } else if (diff === 1) {
      score = 0;
    } else {
      score = Math.max(-1.0, -0.1 * diff);
    }

    return {
      score,
      tier: areaTier,
      tierLabel,
      withinBudget: diff <= 0,
    };
  } else {
    const areaTier = outcode ? getRentPriceTier(outcode) : 2;
    const userTier = budgetToRentTierIndex(budget);
    const tierLabel = RENT_TIERS[areaTier]?.label ?? 'unknown';
    
    const diff = areaTier - userTier;
    let score = 0;
    
    if (diff <= 0) {
      score = 0.1;
    } else if (diff === 1) {
      score = 0;
    } else {
      score = Math.max(-1.0, -0.1 * diff);
    }

    return {
      score,
      tier: areaTier,
      tierLabel,
      withinBudget: diff <= 0,
    };
  }
}

export const PRICE_WEIGHT = 0.15;
