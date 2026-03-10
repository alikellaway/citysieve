# CitySieve V2 Scoring & Data Plan (Phases 2 & 3)

This document is intended to be read and executed by future agents. Phase 1 (DB Centroid Grids) has
already been implemented and replaces the arbitrary hex-grid math with real UK Outcode centroids
stored in the database. Phases 2 and 3 are documented below.

---

## Phase 2: Isochrones & Distance Decay

**Goal:** Transition from a flat 1km geometric radius to a 15-minute walking isochrone, and replace
boolean counting with a distance-decay scoring model.

### Why this matters

1. **The cliff-edge problem.** Currently, an amenity 999m away gives 1 point and one 1001m away
   gives 0. A decay model ensures amenities closer to the centroid are weighted higher than fringe
   ones, producing smooth and realistic scores.
2. **Pedestrian reality.** People don't fly over rivers or railway lines. A 1km geometric circle
   often includes areas that take 45 minutes to walk to due to natural barriers. Isochrones map the
   actual reachable street network.

### Key files to modify

| File | Change |
|------|--------|
| `src/lib/data/routing.ts` | **Create.** Fetches a 15-min walking isochrone polygon for a centroid. |
| `src/app/api/overpass/route.ts` | Replace `around:1000` with an Overpass `poly:` boundary from the isochrone. Return decayed float scores instead of integer counts. |
| `src/lib/scoring/engine.ts` | Update normalization logic — inputs are now floats (decayed scores) not raw counts. |

### Execution steps

#### 2.1 Integrate a routing API for isochrones

- Use **OpenRouteService** (free tier, no credit card required). Register at
  `https://openrouteservice.org` and obtain an API key.
- Store the key as `ORS_API_KEY` in `.env.local`.
- **Create `src/lib/data/routing.ts`:**
  - Export `async function getWalkingIsochrone(lat: number, lng: number): Promise<[number, number][]>`
  - Call `https://api.openrouteservice.org/v2/isochrones/foot-walking` with `range: [900]` (900 seconds = 15 min).
  - Parse the GeoJSON `Polygon` feature and return the coordinates array as `[lat, lng][]`.
  - Cache results in a module-level `Map` with a 24h TTL (same pattern as Overpass cache).

#### 2.2 Update Overpass API queries

- In `src/app/api/overpass/route.ts`:
  - Before building the Overpass query, call `getWalkingIsochrone(lat, lng)`.
  - Convert the polygon `[lat, lng][]` array to an Overpass `poly` string:
    `"lat1 lon1 lat2 lon2 ..."` (space-separated, lat before lon).
  - Replace every `(around:${radius},${lat},${lng})` clause with `(poly:"${polyString}")`.
  - Change the Overpass output line to `out center body;` so each element returns its own `lat/lon`.
  - Update the cache key to include a rounded version of the polygon hash (or just use rounded centroid
    as before — the isochrone result for the same centroid will be cached and stable).

#### 2.3 Implement the distance-decay formula

- After fetching from Overpass, for each element compute:
  ```ts
  const dist = haversineMeters(centroidLat, centroidLng, el.lat, el.lon);
  const MAX_DECAY_M = 1500; // ~15 min walk
  const decayScore = Math.max(0, 1 - dist / MAX_DECAY_M);
  ```
- Instead of `counts.supermarkets++`, do `counts.supermarkets += decayScore`.
- The returned object now contains floats (e.g., `supermarkets: 3.74`) rather than integers.
- **No change required to `engine.ts` normalisation** — it already divides by the max across all
  areas, so float inputs work correctly.

#### 2.4 Testing

- Run `npm run build` and resolve any type errors (the `amenities` record already allows `number`,
  so this should be clean).
- Manually compare results for a known city (e.g., Manchester M1) before and after — the top areas
  should remain broadly similar but scores should be smoother and no cliff-edge drops.

---

## Phase 3: Qualitative and Definitive Data Sources

**Goal:** Replace raw OSM tag counts with definitive, qualitative data (Ofsted school ratings, real
transit frequency, police crime data) and weighted OSM footprints.

### Why this matters

1. **Quantity ≠ quality.** 5 corner shops shouldn't outscore 1 Tesco Extra. 10 bus stops with 1 bus
   a week shouldn't outscore 1 stop with a bus every 5 minutes.
2. **Missing OSM data.** School boundaries and quality are often absent on OSM, and crime data simply
   does not exist there. Government Open Data is the authoritative source.

### Key files to modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `School` model with Ofsted rating. |
| `prisma/seed-schools.ts` | **Create.** Seeds the School table from DfE CSV. |
| `src/app/api/transit/route.ts` | **Create.** Fetches scheduled departures from Transport API. |
| `src/app/api/overpass/route.ts` | Add footprint-area multiplier logic for parks/supermarkets. |
| `src/lib/scoring/engine.ts` | Wire transit frequency into `publicTransport` score; wire crime into `peaceAndQuiet`. |

### Execution steps

#### 3.1 Transit frequency API

- Register at `https://www.transportapi.com` (free tier: 1000 calls/day).
- Store key as `TRANSPORT_API_ID` and `TRANSPORT_API_KEY` in `.env.local`.
- **Create `src/app/api/transit/route.ts`:**
  - Accept `lat` and `lng` query params.
  - Call `https://transportapi.com/v3/uk/places.json?lat=...&lon=...&type=bus_stop,train_station`
    to find nearby stops.
  - For each stop (up to 5 nearest), call the live departures endpoint and sum departures in the
    next 2 hours.
  - Return `{ departuresPerHour: number }`.
- In `src/app/results/page.tsx`, fetch this endpoint per candidate area alongside the Overpass
  call (in the same batch of 4).
- In `src/lib/scoring/engine.ts`, replace `area.transport.busFrequency` (which was derived from
  raw `busStop` count) with the `departuresPerHour` value. Normalize as before (max across all
  areas).

#### 3.2 Definitive school data (DfE + Ofsted)

- Download the DfE "Get Information About Schools" (GIAS) open CSV from
  `https://get-information-schools.service.gov.uk/Downloads`. Filter to England only.
- **Add to `prisma/schema.prisma`:**
  ```prisma
  model School {
    id         Int     @id @default(autoincrement())
    urn        String  @unique
    name       String
    lat        Float
    lng        Float
    ofstedRating Int?   // 1=Outstanding, 2=Good, 3=Requires improvement, 4=Inadequate, null=unrated
    phase      String? // Primary, Secondary, etc.
  }
  ```
- Run `npx prisma migrate dev --name add_school_model`.
- **Create `prisma/seed-schools.ts`:**
  - Parse the GIAS CSV.
  - Upsert rows into `School` using the URN as unique key.
  - Run with `npx ts-node prisma/seed-schools.ts`.
- **Create `src/app/api/schools/route.ts`:**
  - Accept `lat`, `lng`, `radiusKm` query params.
  - Query the `School` table using in-memory Haversine filter (or a bounding-box SQL WHERE first).
  - Return `{ schoolScore: number }` — weighted sum where Outstanding=1.0, Good=0.7,
    Requires improvement=0.3, Inadequate=0, Unrated=0.2, decayed by distance.
- In `src/lib/scoring/engine.ts`, replace the `area.normalizedAmenities.schools` value with the
  `schoolScore` from this endpoint (pass it through `AreaProfile.amenities.schools`).

#### 3.3 Crime / Peace & Quiet (Police API)

- No API key required. Use `https://data.police.uk/api/crimes-street/all-crime?lat=...&lng=...&date=YYYY-MM`.
- **Create `src/lib/data/crime.ts`:**
  - Export `async function getCrimeScore(lat: number, lng: number): Promise<number>`.
  - Fetch the last month's street-level crimes for the centroid.
  - Count total incidents. Map via a log-scale to a 0–1 score (low crime = high score).
    Suggested formula: `score = Math.max(0, 1 - Math.log10(count + 1) / 3)`.
  - Cache with 24h TTL (crime data updates monthly).
- In `src/app/results/page.tsx`, call this per candidate area in the batch loop.
- In `src/lib/scoring/engine.ts`, wire the crime score into the `peaceAndQuiet` weight entry
  instead of the current area-type heuristic.

#### 3.4 OSM footprint/quality weighting

- In `src/app/api/overpass/route.ts`, after calculating the `decayScore` (from Phase 2):
  - For `leisure=park`: look for `way` elements (polygons). Compute approximate area from the
    bounding box (`(maxLat - minLat) * (maxLon - minLon) * 111000^2`). Apply a multiplier:
    `Math.min(5, 1 + area / 10000)` (so a 10,000m² park = 2x, a 50,000m² park = 5x max).
  - For `shop=supermarket`: look for known large chains via the `brand` OSM tag. Apply a
    size multiplier: Tesco Extra/Asda/Morrisons = 2x; Sainsbury's/Waitrose = 1.5x;
    Aldi/Lidl/Iceland = 1.2x; otherwise = 1x.
  - Multiply `decayScore` by the applicable multiplier before summing.

#### 3.5 Testing

- After Phase 3.1 (transit): verify Manchester Piccadilly area scores high on `publicTransport`.
- After Phase 3.2 (schools): verify areas with Outstanding schools near a work location score
  materially higher on `schools` when `schoolPriority` is set to Important.
- After Phase 3.3 (crime): verify areas in notoriously high-crime postcodes score lower on
  `peaceAndQuiet`.
- Run `npm run build` and the full test suite after each sub-phase.

---

## Environment variables required (add to `.env.local` and Deployment docs)

```
ORS_API_KEY=           # OpenRouteService — isochrones (Phase 2)
TRANSPORT_API_ID=      # TransportAPI.com — transit frequency (Phase 3)
TRANSPORT_API_KEY=     # TransportAPI.com — transit frequency (Phase 3)
```

The Police API and DfE CSV require no credentials.
