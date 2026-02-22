/**
 * Returns the fill colour for a rank badge or map pin.
 * Top 3 → green, 4–7 → amber, 8+ → slate.
 */
export function getRankColor(rank: number): string {
  if (rank <= 3) return '#22c55e'; // green-500
  if (rank <= 7) return '#f59e0b'; // amber-500
  return '#94a3b8';                // slate-400
}
