import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { prisma } from '../../src/lib/db';
import { fetchOverpassMetrics, fetchTransitMetrics, fetchSchoolMetrics } from '../../src/lib/data/metrics';
import { getCrimeScore } from '../../src/lib/data/crime';
import { main } from '../../scripts/update-metrics';

vi.mock('fs');
vi.mock('../../src/lib/db', () => ({
  prisma: {
    areaCentroid: {
      findMany: vi.fn(),
    },
    candidateMetrics: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../../src/lib/data/metrics', () => ({
  fetchOverpassMetrics: vi.fn(),
  fetchTransitMetrics: vi.fn(),
  fetchSchoolMetrics: vi.fn(),
}));

vi.mock('../../src/lib/data/crime', () => ({
  getCrimeScore: vi.fn(),
}));

describe('update-metrics script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('backs up the database if it exists', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(prisma.areaCentroid.findMany).mockResolvedValue([]);

    const promise = main();
    await vi.runAllTimersAsync();
    await promise;

    expect(fs.copyFileSync).toHaveBeenCalledWith('./dev.db', './dev.db.bak');
  });

  it('processes stale or missing centroids with exponential backoff and delay logic', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const mockCentroids = [
      { id: '1', outcode: 'A1', lat: 10, lng: 20 },
      { id: '2', outcode: 'A2', lat: 30, lng: 40 },
    ];
    vi.mocked(prisma.areaCentroid.findMany).mockResolvedValue(mockCentroids as any);

    const mockOverpassSuccess = { 
      supermarkets: 1, 
      highStreet: 2, 
      pubsBars: 3, 
      restaurantsCafes: 4, 
      parksGreenSpaces: 5, 
      gymsLeisure: 6, 
      healthcare: 7, 
      librariesCulture: 8, 
      schools: 9, 
      trainStation: 10, 
      busStop: 11 
    };
    
    vi.mocked(fetchOverpassMetrics)
      .mockRejectedValueOnce({ status: 429, message: '429' })
      .mockResolvedValueOnce(mockOverpassSuccess as any)
      .mockResolvedValueOnce(mockOverpassSuccess as any);

    vi.mocked(fetchTransitMetrics).mockResolvedValue(10);
    vi.mocked(fetchSchoolMetrics).mockResolvedValue(0.5);
    vi.mocked(getCrimeScore).mockResolvedValue(0.8);

    const promise = main();
    await vi.runAllTimersAsync();
    await promise;

    expect(prisma.candidateMetrics.upsert).toHaveBeenCalledTimes(2);

    expect(prisma.candidateMetrics.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { areaCentroidId: '1' },
      })
    );

    expect(fetchOverpassMetrics).toHaveBeenCalledTimes(3);
  });
});