# Architecture

## Directory structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (delegates all providers to providers.tsx)
│   ├── providers.tsx           # Client component: ThemeProvider + SessionProvider + SurveyProvider
│   ├── page.tsx                # Landing page
│   ├── quick-survey/
│   │   ├── layout.tsx          # Minimal layout (SiteHeader only, no progress bar)
│   │   └── page.tsx            # Single-page quick survey (~4 questions → /results)
│   ├── survey/
│   │   ├── layout.tsx          # Survey layout (SiteHeader + ProgressBar)
│   │   ├── profile/page.tsx    # Step 1
│   │   ├── commute/page.tsx    # Step 2
│   │   ├── family/page.tsx     # Step 3
│   │   ├── lifestyle/page.tsx  # Step 4
│   │   ├── transport/page.tsx  # Step 5
│   │   ├── environment/page.tsx# Step 6
│   │   └── review/page.tsx     # Review answers
│   ├── results/page.tsx        # Results with map
│   ├── my-surveys/page.tsx     # Saved surveys list
│   └── api/                    # See docs/api-routes.md
├── components/                 # See docs/components.md
├── hooks/
│   ├── useSurvey.ts            # Survey state hook (includes loadState)
│   └── useDebounce.ts          # Debounces a value (not a callback)
├── lib/
│   ├── auth.ts                 # NextAuth v5 config (see docs/auth-database.md)
│   ├── db.ts                   # Prisma client singleton
│   ├── survey/                 # See docs/survey-system.md
│   ├── scoring/                # See docs/scoring-engine.md
│   ├── data/                   # Area generator, Nominatim, Overpass, Postcode clients
│   │   ├── area-generator.ts   # Hex grid generation
│   │   ├── nominatim.ts        # Forward geocoding (search)
│   │   └── postcode.ts         # UK postcode lookup via postcodes.io
│   └── utils.ts                # cn() class merging utility
├── middleware.ts                # Attaches auth session to /api/survey/* routes
├── styles/globals.css          # Tailwind + CSS custom properties
└── types/next-auth.d.ts        # Session type augmentation (adds user.id)
```

## Provider hierarchy

Root layout (`src/app/layout.tsx`) wraps the entire app via `src/app/providers.tsx`:

```
<html suppressHydrationWarning>        ← suppressHydrationWarning here (next-themes sets class=)
  <body>
    <ThemeProvider attribute="class">  ← next-themes; sets .dark on <html>; default: system
      <SessionProvider>                ← NextAuth client context
        <SurveyProvider>               ← useReducer + localStorage persistence
          {children}
        </SurveyProvider>
      </SessionProvider>
    </ThemeProvider>
  </body>
</html>
```

The survey layout (`src/app/survey/layout.tsx`) adds `SiteHeader` + `ProgressBar` for all `/survey/*` pages including review.

## Data flow

1. **Survey input** — User fills 6 steps. Each step dispatches partial updates to the survey reducer, which persists state to `localStorage` under key `'citysieve-survey-state'`.
2. **Area generation** — Results page calls `generateCandidateAreas()` to create a hex grid of candidate points around the user's work or family location.
3. **Amenity + postcode fetch** — Each candidate's amenities are fetched via `/api/overpass` (batched, 4 concurrent) and postcode district via `getPostcodeDistrict()` (postcodes.io, cached 24h). Overpass route caches results in memory (24h TTL, ~500m coordinate rounding).
4. **Scoring** — `scoreAndRankAreas()` normalizes amenity counts, applies hard filters, extracts weights from survey state, scores each area, and returns top 10.
5. **Naming** — Area names are constructed from postcode lookup (e.g., "Covent Garden, WC2N" or just "WC2N" if no place name available). Fallback: coordinate placeholder.
6. **Display** — Results shown as ranked cards + Leaflet map with interactive markers.

## Key patterns

**Survey page pattern** — every step page follows this structure:
```tsx
'use client';
// 1. Import useSurvey, Card, StepNavigation, relevant UI components
// 2. Define option arrays as constants outside component
// 3. Destructure { state, updateXxx, setStep } from useSurvey()
// 4. useEffect(() => setStep(N), [setStep])  — sets progress bar
// 5. Return Card with form fields + StepNavigation at bottom
```

**State updates** — use partial updates: `updateCommute({ daysPerWeek: 3 })`. The reducer merges partials into existing state. Use `loadState(fullState)` to restore a saved survey.

**Auth pattern** — `SessionProvider` wraps the app in root layout. Use `useSession()` from `next-auth/react` in client components. Use `auth()` from `@/lib/auth` in server-side API routes.

**UI components** — all in `src/components/ui/`, follow shadcn/ui conventions (Radix + CVA + `cn()`). Don't modify these unless fixing a bug.
