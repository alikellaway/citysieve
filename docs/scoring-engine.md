# Scoring Engine

## Pipeline overview

The results page (`src/app/results/page.tsx`) orchestrates the full pipeline:

```
generateCandidateAreas() → fetch amenities + postcode → build AreaProfile[]
  → scoreAndRankAreas() → display top 10
```

Area names are fetched during the amenity batch via `getPostcodeDistrict()` (postcodes.io), which returns `{ outcode, placeName }`. Names are constructed as `"Place Name, OUTCODE"` or just `"OUTCODE"` if no place name is available.

### Ring-based "Search further afield"

Results are grouped into **rings**. Each ring represents a 20 km band of distance from the search centre:

- Initial load: ring 0–20 km (`fetchRingResults(centre, innerKm=0, outerKm=20)`)
- First "Search further afield" press: ring 20–40 km
- Second press: ring 40–60 km, and so on

The helper `fetchRingResults(centre, innerKm, outerKm, setProgressFn)`:
1. Calls `generateCandidateAreas(centre, outerKm, 3)` to get the full outer grid
2. If `innerKm > 0`, filters candidates to those with `haversineDistance(centre, candidate) > innerKm`
3. Fetches amenities and postcode district, builds profiles, calls `scoreAndRankAreas()`
4. Returns the top 10 scored areas for that ring

State involved: `resultRings: ResultRing[]` (accumulates rings), `searchedRadiusKm` (tracks the outermost ring searched), `isLoadingMore`, `moreProgress`. The map receives `allResults = resultRings.flatMap(r => r.items)` so all rings appear on the map simultaneously.

## Area generation (`src/lib/data/area-generator.ts`)

`generateCandidateAreas(center, radiusKm, spacingKm)` creates a hex grid of candidate points within a circle around the centre.

- **centre** = resolved in priority order:
  1. `state.commute.workLocation` — for non-remote users this is the geocoded workplace; for remote users this is the anchor city chosen by `resolveRegionAnchor()` (see below).
  2. `state.family.familyLocation` — used if no work/region location was set.
  3. Hardcoded fallback `[53.48, -2.24]` (Manchester) — only reached when the quick-survey remote user selected "Anywhere in the UK" and no family location was provided.

#### Remote region anchors (`src/app/quick-survey/page.tsx` — `resolveRegionAnchor`)

Each UK region in `REMOTE_REGIONS` stores three named anchor cities (`urban`, `suburban`, `rural`). When a remote user picks a region, `resolveRegionAnchor()` picks the most appropriate anchor based on their area type preference:

| Area type preference | Anchor chosen |
|---|---|
| `city_centre` or `inner_suburb` selected | `urban` anchor (e.g. Glasgow for Scotland) |
| `outer_suburb` selected (without urban) | `suburban` anchor (e.g. Edinburgh) |
| `town` or `rural` selected (without urban/suburban) | `rural` anchor (e.g. Perth) |
| No preference selected | `urban` anchor (best default — most populated areas nearby) |

This ensures the hex grid fans out from a real populated centre rather than a geographic midpoint (which could be sea, mountains, or moorland).
- **radiusKm** = 20 (default)
- **spacingKm** = 3 (default) — but see smart density below
- Returns `CandidateArea[]` with `{ id, name: '', lat, lng }` — name is populated later via postcode lookup

### Smart density (`results/page.tsx` — `generateValidCandidates`)

After generating the initial grid, `filterValidCandidates()` (postcodes.io bulk API, 2km radius) discards points over the sea or with no UK postcode nearby. For coastal searches (e.g., Brighton, Bournemouth), a large portion of the 20km radius may be over sea — resulting in significantly fewer viable candidates than an inland search.

To compensate, `generateValidCandidates()` applies a smart density fallback:

1. Generate at standard 3km spacing, run the sea filter.
2. If fewer than 100 valid points remain (≥37% of grid was sea), compute `landRatio = valid / raw`.
3. Calculate a denser spacing: `newSpacing = 3 × √landRatio`, clamped to `[1.8, 2.5]` km.
4. Regenerate and re-filter with the denser spacing.

This ensures coastal users receive a comparable number of scored areas to inland users, with no impact on performance for fully inland searches.

## Amenity fetching

Each candidate's amenities are fetched via `/api/overpass` (see [api-routes.md](./api-routes.md)).

**Batch size is 4 concurrent requests**. Do not increase this — Overpass rate limits aggressively.

The fetch includes retry logic (2 retries with exponential backoff for 429 responses).

## AreaProfile (`src/lib/scoring/engine.ts`)

```ts
interface AreaProfile {
  id: string;
  name: string;                               // "Place Name, OUTCODE" or "OUTCODE" (postcode district)
  outcode?: string;                           // UK postcode district, e.g., "WC2N"
  coordinates: { lat: number; lng: number };
  amenities: Record<string, number>;         // raw counts from Overpass
  normalizedAmenities: Record<string, number>; // 0-1 normalized across all candidates
  transport: { trainStationProximity: number; busFrequency: number };
  environment: { type: AreaType; greenSpaceCoverage: number };
  commuteEstimate?: number;                  // minutes, best across user's selected modes
  commuteBreakdown?: Partial<Record<CommuteMode, number>>; // minutes per selected mode
}
```

Area names come from `getPostcodeDistrict()` (postcodes.io), which returns `{ outcode, placeName }`. If `placeName` is available, the name is `"${placeName}, ${outcode}"` (e.g., "Covent Garden, WC2N"). Otherwise, just the outcode (e.g., "WC2N"). Fallback for failed lookups: coordinate placeholder.

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
- Transport Likert values → normalized weights (`publicTransport`, `trainStation`)
- `broadband` = `normalizeLikert(broadbandImportance)` — scored against area-type proxy (city_centre/inner_suburb=1.0, outer_suburb/town=0.7, rural=0.3)
- Environment Likert values → normalized weights
- `schools` — derived from `childrenStatus` + `schoolPriority`: `no children → 0`, `not_important → 0.1`, `has children + priority → 0.75`
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
