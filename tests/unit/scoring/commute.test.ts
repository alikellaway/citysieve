import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  estimateCommuteTime,
  bestCommuteTime,
  commuteBreakdown,
} from '@/lib/scoring/commute';

describe('commute logic', () => {
  describe('haversineDistance', () => {
    it('returns 0 for the exact same point', () => {
      expect(haversineDistance(51.5, -0.1, 51.5, -0.1)).toBe(0);
    });

    it('calculates roughly correct distance for London to Manchester', () => {
      // London ~ 51.5, -0.1
      // Manchester ~ 53.48, -2.24
      // Distance is ~260km
      const dist = haversineDistance(51.5, -0.1, 53.48, -2.24);
      expect(dist).toBeGreaterThan(240);
      expect(dist).toBeLessThan(280);
    });

    it('is symmetrical', () => {
      const d1 = haversineDistance(51.5, -0.1, 53.48, -2.24);
      const d2 = haversineDistance(53.48, -2.24, 51.5, -0.1);
      expect(d1).toBe(d2);
    });
  });

  describe('estimateCommuteTime', () => {
    const lat1 = 51.5;
    const lng1 = -0.1;
    // Point approx 30km away
    const lat2 = 51.5;
    const lng2 = 0.33; // ~43km longitude diff at 51.5deg is roughly 30km

    it('calculates driving time (30km/h)', () => {
      const dist = haversineDistance(lat1, lng1, lat2, lng2);
      const expected = (dist / 30) * 60;
      expect(estimateCommuteTime(lat1, lng1, lat2, lng2, 'drive')).toBeCloseTo(expected);
    });

    it('calculates train time (50km/h + 10m overhead)', () => {
      const dist = haversineDistance(lat1, lng1, lat2, lng2);
      const expected = (dist / 50) * 60 + 10;
      expect(estimateCommuteTime(lat1, lng1, lat2, lng2, 'train')).toBeCloseTo(expected);
    });

    it('calculates bus time (15km/h)', () => {
      const dist = haversineDistance(lat1, lng1, lat2, lng2);
      const expected = (dist / 15) * 60;
      expect(estimateCommuteTime(lat1, lng1, lat2, lng2, 'bus')).toBeCloseTo(expected);
    });

    it('calculates cycle time (15km/h)', () => {
      const dist = haversineDistance(lat1, lng1, lat2, lng2);
      const expected = (dist / 15) * 60;
      expect(estimateCommuteTime(lat1, lng1, lat2, lng2, 'cycle')).toBeCloseTo(expected);
    });

    it('calculates walk time (5km/h)', () => {
      const dist = haversineDistance(lat1, lng1, lat2, lng2);
      const expected = (dist / 5) * 60;
      expect(estimateCommuteTime(lat1, lng1, lat2, lng2, 'walk')).toBeCloseTo(expected);
    });
  });

  describe('bestCommuteTime', () => {
    const lat1 = 51.5, lng1 = -0.1, lat2 = 51.5, lng2 = 0.33;

    it('falls back to drive when no modes provided', () => {
      const driveTime = estimateCommuteTime(lat1, lng1, lat2, lng2, 'drive');
      expect(bestCommuteTime(lat1, lng1, lat2, lng2, [])).toBe(driveTime);
    });

    it('returns the minimum time across modes', () => {
      const driveTime = estimateCommuteTime(lat1, lng1, lat2, lng2, 'drive');
      const walkTime = estimateCommuteTime(lat1, lng1, lat2, lng2, 'walk');
      const trainTime = estimateCommuteTime(lat1, lng1, lat2, lng2, 'train');
      
      const best = bestCommuteTime(lat1, lng1, lat2, lng2, ['walk', 'train', 'drive']);
      expect(best).toBe(Math.min(driveTime, walkTime, trainTime));
    });
  });

  describe('commuteBreakdown', () => {
    const lat1 = 51.5, lng1 = -0.1, lat2 = 51.5, lng2 = 0.33;

    it('returns an object with times for each mode', () => {
      const breakdown = commuteBreakdown(lat1, lng1, lat2, lng2, ['drive', 'cycle']);
      expect(breakdown).toHaveProperty('drive');
      expect(breakdown).toHaveProperty('cycle');
      expect(breakdown).not.toHaveProperty('walk');
      
      expect(breakdown.drive).toBe(estimateCommuteTime(lat1, lng1, lat2, lng2, 'drive'));
      expect(breakdown.cycle).toBe(estimateCommuteTime(lat1, lng1, lat2, lng2, 'cycle'));
    });
  });
});
