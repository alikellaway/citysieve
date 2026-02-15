# CitySeive

A Next.js application that helps users find their ideal neighbourhood by analysing their lifestyle priorities against real OpenStreetMap data.

## Project Status

**MVP is feature-complete.** All survey steps, review page, and results page with interactive map are built. The app has not yet been deployed or had end-to-end testing beyond local dev verification.

### What's built

- **Landing page** (`src/app/page.tsx`) — entry point with "Start Survey" CTA
- **6 survey steps** — Profile, Commute, Family & Social, Lifestyle, Transport, Environment
- **Review page** (`src/app/survey/review/page.tsx`) — summary of all answers with per-section edit links
- **Results page** (`src/app/results/page.tsx`) — generates candidate areas, fetches amenities, scores/ranks, shows interactive Leaflet map + result cards
- **Scoring engine** (`src/lib/scoring/`) — weighted scoring with hard filters, commute estimation, amenity normalisation
- **API routes** — `/api/geocode` (Nominatim wrapper), `/api/overpass` (OSM amenity counts)
- **State management** — React Context + useReducer with localStorage persistence
- **Reusable survey components** — LikertScale, LocationAutocomplete, AmenityRatingGrid, TagInput, BudgetSlider, StepNavigation, ProgressBar

### What's not done yet

- No automated tests
- No deployment configuration
- Area names in results come from reverse geocoding coordinates — could be improved with a proper gazetteer
- No error boundaries or offline handling
- No accessibility audit

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + CSS custom properties for theming
- **UI primitives**: Radix UI (via shadcn/ui pattern)
- **Validation**: Zod schemas
- **Map**: Leaflet + react-leaflet (dynamically imported, SSR disabled)
- **Data**: OpenStreetMap Nominatim (geocoding) + Overpass API (amenities)

## Architecture

### Directory structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (wraps SurveyProvider)
│   ├── page.tsx                # Landing page
│   ├── survey/
│   │   ├── layout.tsx          # Survey layout (heading + ProgressBar)
│   │   ├── profile/page.tsx    # Step 1
│   │   ├── commute/page.tsx    # Step 2
│   │   ├── family/page.tsx     # Step 3
│   │   ├── lifestyle/page.tsx  # Step 4
│   │   ├── transport/page.tsx  # Step 5
│   │   ├── environment/page.tsx# Step 6
│   │   └── review/page.tsx     # Review answers
│   ├── results/page.tsx        # Results with map
│   └── api/
│       ├── geocode/route.ts    # Nominatim proxy
│       └── overpass/route.ts   # Overpass proxy
├── components/
│   ├── survey/                 # Survey-specific components
│   ├── results/                # ResultCard, ResultMap
│   └── ui/                     # Radix/shadcn primitives
├── hooks/
│   ├── useSurvey.ts            # High-level survey state hook
│   └── useDebounce.ts
└── lib/
    ├── survey/
    │   ├── types.ts            # All TypeScript types/enums
    │   ├── schema.ts           # Zod validation schemas
    │   ├── context.tsx         # SurveyProvider + reducer
    │   └── steps.ts            # Step definitions (id, name, path, number)
    ├── scoring/
    │   ├── engine.ts           # scoreAndRankAreas(), normalizeAmenities()
    │   ├── weights.ts          # extractWeights() from survey state
    │   ├── filters.ts          # applyHardFilters()
    │   └── commute.ts          # haversine distance, commute time estimation
    ├── data/
    │   ├── area-generator.ts   # generateCandidateAreas() hex grid
    │   ├── nominatim.ts        # Nominatim client
    │   └── overpass.ts         # Overpass client
    └── utils.ts                # cn() class merging utility
```

### Key patterns

**Survey page pattern** — every step page follows this structure:
```tsx
'use client';
// 1. Import useSurvey, Card, StepNavigation, relevant UI components
// 2. Define option arrays as constants outside component
// 3. Destructure { state, updateXxx, setStep } from useSurvey()
// 4. useEffect(() => setStep(N), [setStep])  — sets progress bar
// 5. Return Card with form fields + StepNavigation at bottom
```

**State updates** — use partial updates: `updateCommute({ daysPerWeek: 3 })`. The reducer merges partials into existing state. State persists to localStorage under key `'cityseive-survey-state'`.

**UI components** — all in `src/components/ui/`, follow shadcn/ui conventions (Radix + CVA + cn()). Don't modify these unless fixing a bug.

**Scoring pipeline**: `generateCandidateAreas()` → fetch amenities via `/api/overpass` → build `AreaProfile[]` → `scoreAndRankAreas()` (normalize → filter → weight → score → rank → top 10).

### Important implementation details

- **Leaflet must be dynamically imported** with `ssr: false` because it requires `window`. See `ResultMap.tsx` and its dynamic import in `results/page.tsx`.
- **Overpass API has rate limits** — the results page batches requests (4 concurrent). Be careful not to increase batch size.
- **The `/api/overpass` route caches results** in memory with 24h TTL, keyed by rounded coordinates (~500m precision).
- **`useDebounce` hook** is used differently from typical — it debounces a callback function, not a value. See `LocationAutocomplete.tsx`.
- **Type enums are string unions**, not TypeScript `enum`s. They're defined in `src/lib/survey/types.ts`.

## Commands

```bash
npm run dev    # Start dev server (localhost:3000)
npm run build  # Production build
npm run lint   # ESLint
```

## Tips for future agents

1. **Read `src/lib/survey/types.ts` first** — it defines every type used across the app. All survey step interfaces, enum types, and the top-level `SurveyState` are here.
2. **Follow existing patterns exactly** — the codebase is consistent. Copy the profile page pattern for any new survey steps.
3. **Don't modify UI primitives** (`src/components/ui/`) unless absolutely necessary.
4. **The review page has its own layout** — it doesn't use the survey layout's ProgressBar (it renders its own heading). This is intentional.
5. **Results page reverse-geocodes area names** — this hits `/api/geocode` with lat,lng coordinates. The quality of names depends on Nominatim's coverage.
6. **All state lives in React Context** — there's no server-side state. The SurveyProvider wraps the entire app in root layout.
