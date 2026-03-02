export const SALE_TIERS = [
  { max: 200000, label: 'under_200k' },
  { max: 350000, label: '200k_350k' },
  { max: 500000, label: '350k_500k' },
  { max: 750000, label: '500k_750k' },
  { max: Infinity, label: 'over_750k' },
] as const;

export const RENT_TIERS = [
  { max: 1000, label: 'under_1k' },
  { max: 1500, label: '1k_1.5k' },
  { max: 2000, label: '1.5k_2k' },
  { max: 2500, label: '2k_2.5k' },
  { max: Infinity, label: 'over_2.5k' },
] as const;

export type SaleTierLabel = typeof SALE_TIERS[number]['label'];
export type RentTierLabel = typeof RENT_TIERS[number]['label'];

export function budgetToSaleTierIndex(budget: number): number {
  for (let i = 0; i < SALE_TIERS.length; i++) {
    if (budget < SALE_TIERS[i].max) return i;
  }
  return SALE_TIERS.length - 1;
}

export function budgetToRentTierIndex(budget: number): number {
  for (let i = 0; i < RENT_TIERS.length; i++) {
    if (budget < RENT_TIERS[i].max) return i;
  }
  return RENT_TIERS.length - 1;
}
