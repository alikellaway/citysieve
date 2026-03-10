import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCandidateAreas } from '@/lib/data/area-generator';

describe('area-generator logic', () => {
  const london = { label: 'London', lat: 51.5, lng: -0.1 };

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('fetches candidate areas from the API', async () => {
    const mockData = [
      { id: 'outcode_SW1A', name: 'SW1A', lat: 51.5, lng: -0.1, outcode: 'SW1A' }
    ];
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const areas = await fetchCandidateAreas(london, 5);
    expect(areas.length).toBe(1);
    expect(areas[0].lat).toBeCloseTo(51.5, 3);
    expect(areas[0].outcode).toBe('SW1A');
    expect(global.fetch).toHaveBeenCalledWith('/api/candidates?lat=51.5&lng=-0.1&radius=5');
  });

  it('throws an error if the API fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false
    });

    await expect(fetchCandidateAreas(london, 5)).rejects.toThrow('Failed to fetch candidate areas from DB');
  });
});