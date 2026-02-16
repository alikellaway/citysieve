# CitySeive

A Next.js application that helps users find their ideal neighbourhood by analysing their lifestyle priorities against real OpenStreetMap data.

## Project Status

**MVP is feature-complete with user accounts, ad slots, and donations.** All survey steps, review page, results page with interactive map, user authentication (Google OAuth via NextAuth), survey saving/loading, placeholder ad slots, and a Buy Me a Coffee donation button are built.

### What's built

- **Landing page** (`src/app/page.tsx`) — entry point with SiteHeader, CTA, ad slot, donation button
- **6 survey steps** — Profile, Commute, Family & Social, Lifestyle, Transport, Environment
- **Review page** (`src/app/survey/review/page.tsx`) — summary with edit links, sign-in prompt for unauthenticated users
- **Results page** (`src/app/results/page.tsx`) — scored areas, Leaflet map, ad slots between results, save button, donation button
- **My Surveys page** (`src/app/my-surveys/page.tsx`) — list/load/delete saved surveys
- **Authentication** — NextAuth v5 with Google OAuth, Prisma adapter, database sessions
- **Database** — Prisma ORM with SQLite (User, Account, Session, SavedSurvey models)
- **Ad slots** — Reusable `AdSlot` component with banner/rectangle/leaderboard variants
- **Donation** — Buy Me a Coffee button, configurable via `NEXT_PUBLIC_BMAC_USERNAME` env var
- **Scoring engine** (`src/lib/scoring/`) — weighted scoring with hard filters, commute estimation, amenity normalisation
- **API routes** — `/api/geocode`, `/api/overpass`, `/api/auth/[...nextauth]`, `/api/survey/save`, `/api/survey/list`, `/api/survey/[id]`
- **State management** — React Context + useReducer with localStorage persistence + LOAD_STATE action for restoring saved surveys
- **Shared header** — `SiteHeader` component with auth button used across all pages

### What's not done yet

- Google OAuth credentials need to be configured in `.env.local` for auth to work
- No automated tests
- No deployment configuration (planned for Hostinger VPS)
- Area names in results come from reverse geocoding — could be improved
- Ad slots are placeholders — swap for real AdSense when ready
- No error boundaries or offline handling
- No accessibility audit

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript (strict mode)
- **Auth**: NextAuth v5 (Auth.js) with Google OAuth provider
- **Database**: Prisma ORM + SQLite
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
│   ├── layout.tsx              # Root layout (SessionProvider + SurveyProvider)
│   ├── page.tsx                # Landing page
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
│   └── api/
│       ├── auth/[...nextauth]/route.ts  # NextAuth handler
│       ├── geocode/route.ts    # Nominatim proxy
│       ├── overpass/route.ts   # Overpass proxy
│       └── survey/
│           ├── save/route.ts   # Save survey (POST)
│           ├── list/route.ts   # List saved surveys (GET)
│           └── [id]/route.ts   # Get/delete single survey
├── components/
│   ├── ads/AdSlot.tsx          # Placeholder ad component (banner/rectangle/leaderboard)
│   ├── auth/AuthButton.tsx     # Sign in/out button with avatar
│   ├── donate/DonateButton.tsx # Buy Me a Coffee button
│   ├── layout/SiteHeader.tsx   # Shared header with auth
│   ├── providers/SessionProvider.tsx  # NextAuth client wrapper
│   ├── survey/                 # Survey-specific components
│   ├── results/                # ResultCard, ResultMap
│   └── ui/                     # Radix/shadcn primitives
├── generated/prisma/           # Prisma generated client (gitignored output)
├── hooks/
│   ├── useSurvey.ts            # Survey state hook (includes loadState)
│   └── useDebounce.ts
├── lib/
│   ├── auth.ts                 # NextAuth v5 config (providers, adapter, callbacks)
│   ├── db.ts                   # Prisma client singleton
│   ├── survey/
│   │   ├── types.ts            # All TypeScript types/enums
│   │   ├── schema.ts           # Zod validation schemas
│   │   ├── context.tsx         # SurveyProvider + reducer (includes LOAD_STATE)
│   │   └── steps.ts            # Step definitions
│   ├── scoring/                # Scoring engine, weights, filters, commute
│   ├── data/                   # Area generator, Nominatim, Overpass clients
│   └── utils.ts                # cn() class merging utility
├── middleware.ts                # Attaches auth session to /api/survey/* routes
└── types/next-auth.d.ts        # Session type augmentation (adds user.id)
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

**State updates** — use partial updates: `updateCommute({ daysPerWeek: 3 })`. The reducer merges partials into existing state. State persists to localStorage under key `'cityseive-survey-state'`. Use `loadState(fullState)` to restore a saved survey from the database.

**Auth pattern** — `SessionProvider` wraps the app in root layout. Use `useSession()` from `next-auth/react` in client components. Use `auth()` from `@/lib/auth` in server-side API routes.

**UI components** — all in `src/components/ui/`, follow shadcn/ui conventions (Radix + CVA + cn()). Don't modify these unless fixing a bug.

**Scoring pipeline**: `generateCandidateAreas()` → fetch amenities via `/api/overpass` → build `AreaProfile[]` → `scoreAndRankAreas()` (normalize → filter → weight → score → rank → top 10).

### Important implementation details

- **Leaflet must be dynamically imported** with `ssr: false` because it requires `window`. See `ResultMap.tsx` and its dynamic import in `results/page.tsx`.
- **Overpass API has rate limits** — the results page batches requests (4 concurrent). Be careful not to increase batch size.
- **The `/api/overpass` route caches results** in memory with 24h TTL, keyed by rounded coordinates (~500m precision).
- **`useDebounce` hook** debounces a value, not a callback. `LocationAutocomplete` debounces the query string and triggers search via `useEffect`.
- **Type enums are string unions**, not TypeScript `enum`s. They're defined in `src/lib/survey/types.ts`.
- **Prisma client is generated to `src/generated/prisma/`** — import from `@/generated/prisma`. Run `npx prisma generate` after schema changes.
- **Database sessions** — NextAuth uses database strategy, not JWT. Every session check hits SQLite. Fine for small-scale VPS deployment.
- **Ad slots use CVA variants** matching the Button component pattern. Swap placeholder content for real ad scripts when ready.
- **The `SiteHeader` component** is used across all pages — landing, survey layout, results, my-surveys. It contains the `AuthButton`.

## Environment Variables

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
NEXT_PUBLIC_BMAC_USERNAME=cityseive
DATABASE_URL=file:./dev.db
```

## Commands

```bash
npm run dev           # Start dev server (localhost:3000)
npm run build         # Production build
npm run lint          # ESLint
npx prisma migrate dev  # Run database migrations
npx prisma generate   # Regenerate Prisma client after schema changes
npx prisma studio     # Open Prisma database GUI
```

## Tips for future agents

1. **Read `src/lib/survey/types.ts` first** — it defines every type used across the app.
2. **Follow existing patterns exactly** — the codebase is consistent. Copy the profile page pattern for any new survey steps.
3. **Don't modify UI primitives** (`src/components/ui/`) unless absolutely necessary.
4. **The review page renders inside the survey layout** — it gets `SiteHeader` from the layout. Don't add a duplicate header.
5. **Results page reverse-geocodes area names** — this hits `/api/geocode` with lat,lng coordinates.
6. **Auth is optional for survey** — users can complete the survey and see results without signing in. Auth only gates saving surveys.
7. **Survey API routes are protected by middleware** — the middleware at `src/middleware.ts` attaches the session. Routes check `session?.user?.id` and return 401 if absent.
8. **To swap SQLite for another database** — change the `provider` in `prisma/schema.prisma` and `DATABASE_URL` in env. Prisma handles the rest.
9. **To add real ads** — replace the inner content of `AdSlot` component with the ad provider's script. The sizing/positioning stays the same.
10. **To change the BMAC username** — update `NEXT_PUBLIC_BMAC_USERNAME` in `.env.local`. The `DonateButton` reads it at build time.
