# Scoring Engine

## Pipeline overview

The results page (`src/app/results/page.tsx`) orchestrates the full pipeline:

```
generateCandidateAreas() → fetch amenities via /api/overpass → build AreaProfile[]
  → scoreAndRankAreas() → reverse-geocode names → display top 10
```

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
  commuteEstimate?: number;                  // minutes, via bestCommuteTime()
}
```

Area type is classified by distance from centre: <3km city_centre, <8km inner_suburb, <15km outer_suburb, <25km town, else rural.

## Commute estimation (`src/lib/scoring/commute.ts`)

`bestCommuteTime(from, to, modes)` — calculates haversine distance, then estimates time for each mode and returns the minimum.

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
| Commute time | Removes areas where `commuteEstimate > maxCommuteTime` |
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

### ScoredArea output

```ts
interface ScoredArea {
  area: AreaProfile;
  score: number;          // 0-100, rounded to 1 decimal
  highlights: string[];   // top 3 scoring category names
  breakdown: Record<string, number>; // per-category scores (0-100)
}
```

## Reverse geocoding

After scoring, the results page reverse-geocodes each top-10 area's coordinates via `/api/geocode?q=lat,lng` to get a human-readable name (first two parts of `display_name`).
