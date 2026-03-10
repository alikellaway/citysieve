const cache = new Map<string, { score: number; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function getCrimeScore(lat: number, lng: number): Promise<number> {
  const roundedLat = (Math.round(lat * 200) / 200).toFixed(4);
  const roundedLng = (Math.round(lng * 200) / 200).toFixed(4);
  const cacheKey = `${roundedLat},${roundedLng}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.score;
  }

  try {
    // Get last month (API doesn't have current month usually)
    const date = new Date();
    date.setMonth(date.getMonth() - 2);
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}&date=${dateStr}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      if (res.status === 404 || res.status === 500 || res.status === 502) {
        // API often returns errors for areas with no data or off shore
        return 0.5; // fallback neutral score
      }
      throw new Error(`Police API failed: ${res.status}`);
    }

    const data = await res.json();
    const count = data.length || 0;

    // Log-scale mapping to 0-1 (low crime = high score)
    // 0 crimes = 1.0
    // ~10 crimes = ~0.66
    // ~100 crimes = ~0.33
    // >= 1000 crimes = 0.0
    const score = Math.max(0, 1 - Math.log10(count + 1) / 3);

    cache.set(cacheKey, { score, timestamp: Date.now() });
    return score;
  } catch (error) {
    console.error('Crime fetch error:', error);
    // Return a neutral fallback
    return 0.5;
  }
}
