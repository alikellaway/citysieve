# Scoring Engine

## Pipeline overview

The results page (`src/app/results/page.tsx`) orchestrates the full pipeline:

```
generateCandidateAreas() → fetch amenities via /api/overpass → build AreaProfile[]
  → scoreAndRankAreas() → reverse-geocode names → display top 10
```

### Ring-based "Search further afield"

Results are grouped into **rings**. Each ring represents a 20 km band of distance from the search centre:

- Initial load: ring 0–20 km (`fetchRingResults(centre, innerKm=0, outerKm=20)`)
- First "Search further afield" press: ring 20–40 km
- Second press: ring 40–60 km, and so on

The helper `fetchRingResults(centre, innerKm, outerKm, setProgressFn)`:
1. Calls `generateCandidateAreas(centre, outerKm, 3)` to get the full outer grid
2. If `innerKm > 0`, filters candidates to those with `haversineDistance(centre, candidate) > innerKm`
3. Fetches amenities, builds profiles, calls `scoreAndRankAreas()`, and reverse-geocodes — all using the same survey state
4. Returns the top 10 scored areas for that ring

State involved: `resultRings: ResultRing[]` (accumulates rings), `searchedRadiusKm` (tracks the outermost ring searched), `isLoadingMore`, `moreProgress`. The map receives `allResults = resultRings.flatMap(r => r.items)` so all rings appear on the map simultaneously.

## Area generation (`src/lib/data/area-generator.ts`)

`generateCandidateAreas(center, radiusKm, spacingKm)` creates a hex grid of candidate points within a circle around the centre.

- **centre** = user's work location or family location, falling back to `[53.48, -2.24]` (Manchester)
- **radiusKm** = 20 (default)
- **spacingKm** = 3 (default)
- Returns `CandidateArea[]` with `{ id, name, lat, lng }`

## Amenity fetching

Each candidate's amenities are fetched via `/api/overpass` (see [api-routes.md](./api-routes.md)).

**Batch size is 4 concurrent requests**. Do not increase this — Overpass rate limits aggressively.

The fetch includes retry logic (2 retries with exponential backoff for 429 responses).

## AreaProfile (`src/lib/scoring/engine.ts`)

```ts
interface AreaProfile {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  amenities: Record<string, number>;         // raw counts from Overpass
  normalizedAmenities: Record<string, number>; // 0-1 normalized across all candidates
  transport: { trainStationProximity: number; busFrequency: number };
  environment: { type: AreaType; greenSpaceCoverage: number };
  commuteEstimate?: number;                  // minutes, best across user's selected modes
  commuteBreakdown?: Partial<Record<CommuteMode, number>>; // minutes per selected mode
}
```

Area type is classified by distance from centre: <3km city_centre, <8km inner_suburb, <15km outer_suburb, <25km town, else rural.

## Commute estimation (`src/lib/scoring/commute.ts`)

`bestCommuteTime(from, to, modes)` — calculates haversine distance, then estimates time for each mode and returns the minimum.

`commuteBreakdown(from, to, modes)` — returns a `Partial<Record<CommuteMode, number>>` with the estimated minutes for each of the given modes. Used to power the per-mode breakdown in `AreaInfoModal`.

Speed assumptions (km/h): drive=30, train=50 (+10min overhead), bus=15, cycle=15, walk=5.

## scoreAndRankAreas (`src/lib/scoring/engine.ts`)

1. **Normalize** — `normalizeAmenities()` divides each area's amenity counts by the max across all candidates (0-1 scale)
2. **Filter** — `applyHardFilters()` removes areas that fail hard constraints (see below)
3. **Weight** — `extractWeights()` converts Likert values to 0-1 weights via `(value - 1) / 4`
4. **Score** — weighted average of normalized amenity scores, transport scores, environment scores, commute score, family proximity, and social scene
5. **Rank** — sort descending by score
6. **Truncate** — return top 10

### Hard filters (`src/lib/scoring/filters.ts`)

| Filter | Logic |
|--------|-------|
| Commute time | Removes areas where `commuteEstimate > maxCommuteTime` **and** `commuteTimeIsHardCap === true`. When the hard cap is off, areas over the limit are not removed — they score 0 on the commute dimension and are naturally deprioritised. |
| Area type | Removes areas > 1 step away from user's preferred type on the scale: city_centre → inner_suburb → outer_suburb → town → rural |
| Excluded areas | Removes areas whose name contains any of the user's excluded area strings (case-insensitive) |

### Weights (`src/lib/scoring/weights.ts`)

`extractWeights(state)` maps survey responses to a `ScoringWeights` object:
- 8 lifestyle Likert values → normalized 0-1 weights
- Transport Likert values → normalized weights
- Environment Likert values → normalized weights
- `familyProximity` from family step
- `socialScene` from family `socialImportance`
- `commute` = `daysPerWeek / 5`

### Labels (`src/lib/scoring/labels.ts`)

`HIGHLIGHT_LABELS` — shared lookup mapping internal scoring keys (e.g. `pubsBars`, `parksGreenSpaces`) to friendly display labels. Used by `ResultCard` for both highlight badges and the score breakdown.

### ScoredArea output

```ts
interface ScoredArea {
  area: AreaProfile;
  score: number;          // 0-100, rounded to 1 decimal
  highlights: string[];   // top 3 scoring category names
  breakdown: Record<string, number>; // per-category scores (0-100)
  weights: ScoringWeights; // user's weight per dimension (for breakdown UI)
}
```

## Reverse geocoding

After scoring, the results page reverse-geocodes each top-10 area's coordinates via `/api/geocode?q=lat,lng` to get a human-readable name.

**Name extraction priority** (uses Nominatim `address` object):
```
suburb → village → hamlet → city_district → town → city
```
Falls back to the first segment of `display_name` if no address parts match.

**Cardinal direction prefixes** are added for city/town/city_district level names when the result is >1.5km from the search centre. Format: `"North Manchester"` (prefix style). Suburbs and villages keep their original names without prefixes.
