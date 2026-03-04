import { describe, it, expect } from 'vitest';
import { generateCandidateAreas } from '@/lib/data/area-generator';

describe('area-generator logic', () => {
  const london = { label: 'London', lat: 51.5, lng: -0.1 };

  it('generates a single point if radius is 0', () => {
    const areas = generateCandidateAreas(london, 0, 2);
    expect(areas.length).toBe(1);
    expect(areas[0].lat).toBeCloseTo(51.5, 3);
    expect(areas[0].lng).toBeCloseTo(-0.1, 3);
  });

  it('generates multiple points within radius', () => {
    const radiusKm = 5;
    const areas = generateCandidateAreas(london, radiusKm, 2);
    
    expect(areas.length).toBeGreaterThan(1);
    
    // Check all generated points are within the expected bounds
    const maxLatDiff = (radiusKm / 111) * 1.1; // adding 10% tolerance for grid edge
    const maxLngDiff = (radiusKm / (111 * Math.cos(london.lat * Math.PI / 180))) * 1.1;
    
    for (const area of areas) {
      expect(Math.abs(area.lat - london.lat)).toBeLessThanOrEqual(maxLatDiff);
      expect(Math.abs(area.lng - london.lng)).toBeLessThanOrEqual(maxLngDiff);
      
      // Check ID format
      expect(area.id).toMatch(/^area_\d+\.\d+_-?\d+\.\d+$/);
    }
  });
});
