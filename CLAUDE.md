# CitySieve

Next.js 15 app helping users find their ideal neighbourhood by scoring real OpenStreetMap data against lifestyle priorities.

**Status**: MVP feature-complete — 6 survey steps, results page with Leaflet map, Google OAuth, survey saving, placeholder ad slots, Buy Me a Coffee button.
**Tech**: Next.js 15 (App Router, React 19), TypeScript, Tailwind, Prisma 7 + SQLite (via libsql adapter), NextAuth v5, Leaflet, Zod, Radix/shadcn UI.

## Commands

```bash
npm run dev             # Dev server (localhost:3000)
npm run build           # Production build
npm run lint            # ESLint
npx prisma migrate dev  # Run database migrations
npx prisma generate     # Regenerate Prisma client after schema changes
npx prisma studio       # Database GUI
```

## Environment Variables

```
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=<generate with: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
NEXT_PUBLIC_BMAC_USERNAME=citysieve
DATABASE_URL=file:./dev.db
NEXT_PUBLIC_AWIN_ID=          # Optional: Awin affiliate ID for Rightmove/Zoopla links in area modal
NEXT_PUBLIC_SPONSORED_URL=    # Optional: URL for sponsored slot in area modal
NEXT_PUBLIC_SPONSORED_LABEL=  # Optional: Sponsor name (e.g. "Habito")
NEXT_PUBLIC_SPONSORED_TEXT=   # Optional: Short tagline (e.g. "Find your best mortgage")
NEXT_PUBLIC_ADSENSE_PUB_ID=   # Optional: Google AdSense display ads (e.g. "ca-pub-1815955226233160")
```

## Critical Gotchas

1. **Leaflet must be dynamically imported** with `ssr: false` — it requires `window`. See `ResultMap.tsx` and `AreaModalMap.tsx`.
2. **Overpass batch size is 4** — the results page fetches amenities 4 at a time. Do not increase this.
3. **Overpass route caches in memory** — 24h TTL, keyed by rounded coordinates (~500m precision).
4. **`useDebounce` debounces a value**, not a callback. `LocationAutocomplete` debounces the query string.
5. **Type enums are string unions**, not TS `enum`s — defined in `src/lib/survey/types.ts`.
6. **Prisma 7 uses a libsql adapter** — `db.ts` creates a `PrismaLibSql` adapter from `@prisma/adapter-libsql` and passes it to `PrismaClient`. The datasource URL lives in `prisma.config.ts` (not in `schema.prisma`). Import the client from `@/generated/prisma/client`.
7. **Database sessions** — NextAuth uses database strategy, not JWT. Every session check hits SQLite.
8. **Don't modify UI primitives** in `src/components/ui/` unless fixing a bug.
9. **POI types and config** are in `src/lib/poi-types.ts` — not in the API route (Next.js route handlers can only export HTTP methods).

## Deeper Documentation

Read these on-demand based on the task at hand:

| Task | Read |
|------|------|
| Understanding overall structure, provider hierarchy, data flow | [docs/architecture.md](docs/architecture.md) |
| Adding/modifying survey steps, fields, state, validation | [docs/survey-system.md](docs/survey-system.md) |
| Changing scoring, ranking, weights, filters, area generation | [docs/scoring-engine.md](docs/scoring-engine.md) |
| Adding/modifying API routes, understanding endpoints | [docs/api-routes.md](docs/api-routes.md) |
| Auth, NextAuth config, Prisma schema, database changes | [docs/auth-database.md](docs/auth-database.md) |
| Modifying UI components, understanding props/behavior | [docs/components.md](docs/components.md) |
| VPS setup, Docker, Nginx, SSL, CI/CD deploy pipeline | [docs/deployment.md](docs/deployment.md) |

## Survey → Results Data Flow

Understanding how user answers translate to external data fetching and scoring.

### Survey Step Impact

| Step | Data Collected | External APIs Affected | Scoring/Filtering Role |
|------|----------------|----------------------|------------------------|
| **1. Profile** | ageRange, tenureType, budget, householdType | None | **None** — purely for user profiling |
| **2. Commute** | workLocation, daysPerWeek, maxCommuteTime, commuteTimeIsHardCap, commuteModes | None directly — uses haversine distance | Hard filter: excludes areas exceeding `maxCommuteTime` if `commuteTimeIsHardCap === true`. Weight: `daysPerWeek / 5` |
| **3. Family** | childrenStatus, schoolPriority, familyLocation, familyProximityImportance, socialImportance | **Overpass API** fetches school + kindergarten counts | Weight: `familyProximityImportance` → family proximity score. Weight: `socialImportance` → pubs + restaurants combined. Weight: derived from `childrenStatus` + `schoolPriority` → school count score (`no children → 0`, `not_important → 0.1`, `has children + priority → 0.75`) |
| **4. Lifestyle** | 8 Likert values (1-5): supermarkets, highStreet, pubsBars, restaurantsCafes, parksGreenSpaces, gymsLeisure, healthcare, librariesCulture | **Overpass API** (`/api/overpass`) fetches counts for all 8 amenity types within 1km of each candidate area | **Primary scoring** — each Likert value becomes a weight multiplied against normalized amenity counts |
| **5. Transport** | carOwnership, publicTransportReliance, trainStationImportance, cycleFrequency, broadbandImportance | **Overpass API** fetches bus stop & train station counts | Weight: `publicTransportReliance` → bus frequency score. Weight: `trainStationImportance` → train proximity score. Weight: `broadbandImportance` → area-type proxy (city_centre/inner_suburb=1.0, outer_suburb/town=0.7, rural=0.3) |
| **6. Environment** | areaTypes[], peaceAndQuiet, excludeAreas[], consideringAreas[] | None — area type derived from distance to centre | Hard filter: `areaTypes` filters by city_centre ↔ rural scale. Hard filter: `excludeAreas` removes areas by name. `consideringAreas` → geocoded at search time; extra 5km hex grids injected as candidates |

### Pipeline Summary

```
Survey completes → SurveyState saved to localStorage
       ↓
Results page loads state, determines centre point:
  workLocation → familyLocation → [53.48, -2.24] (Manchester fallback)
       ↓
Generate ~100-200 candidate grid points (hex pattern, 20km radius)
  + extra 5km grids around each consideringArea (geocoded, deduped by id)
       ↓
For each point (batched 4 at a time):
  1. /api/overpass → 11 amenity counts (supermarkets, shops, pubs, restaurants, 
     parks, gyms, healthcare, libraries, schools, train stations, bus stops)
  2. postcodes.io → UK postcode district + place name
  3. Calculate commute estimate (if workLocation provided)
       ↓
Apply hard filters:
  - Commute time exceeds max? (if hard cap enabled)
  - Area type not in preferred types?
  - Area name in exclude list?
       ↓
Extract weights from Likert values (normalize: (value-1)/4)
       ↓
Score each area: weighted sum of normalized amenities, transport, environment, 
commute, family proximity, social scene
       ↓
Sort by score descending, return top 10
       ↓
Display on map + cards with highlights
```

### Key Files for This Flow

| What | File |
|------|------|
| Survey answers → localStorage | `src/lib/survey/context.tsx` |
| Survey step definitions | `src/lib/survey/steps.ts`, `src/lib/survey/types.ts` |
| Answers → scoring weights | `src/lib/scoring/weights.ts` |
| Answers → hard filters | `src/lib/scoring/filters.ts` |
| Commute estimation | `src/lib/scoring/commute.ts` |
| Candidate area generation | `src/lib/data/area-generator.ts` |
| Overpass API queries | `src/app/api/overpass/route.ts` |
| POI type → OSM tag mapping | `src/lib/poi-types.ts` |
| Results page orchestration | `src/app/results/page.tsx` |
| Scoring engine | `src/lib/scoring/engine.ts` |

## Docs Maintenance

When modifying code, update the corresponding doc file:

| Code path | Doc file |
|-----------|----------|
| `src/app/`, `src/lib/survey/context.tsx`, `src/app/layout.tsx` | `docs/architecture.md` |
| `src/lib/survey/`, `src/hooks/useSurvey.ts`, `src/app/survey/` | `docs/survey-system.md` |
| `src/lib/scoring/`, `src/lib/data/`, `src/app/results/` | `docs/scoring-engine.md` |
| `src/app/api/` | `docs/api-routes.md` |
| `src/lib/auth.ts`, `src/lib/db.ts`, `prisma/schema.prisma` | `docs/auth-database.md` |
| `src/components/` | `docs/components.md` |
| `Dockerfile`, `docker-compose.yml`, `nginx/`, `.github/workflows/` | `docs/deployment.md` |

## Sub-Agents

Use sub-agents to keep the main context clean and speed up focused work. Prefer them for exploration, isolated implementation, and tasks that generate verbose output.

### Custom agents (`.claude/agents/`)

| Agent | When to use |
|-------|-------------|
| `scoring-auditor` | Before changing scoring weights/filters; tracing why an area scored a certain way; auditing scoring edge cases |
| `db-migration-helper` | Adding/modifying Prisma models or fields; running migrations; regenerating the client |
| `map-debugger` | Leaflet rendering issues; SSR errors from map; marker/zoom/bounds bugs; modifying `ResultMap.tsx` |
| `api-route-developer` | Implementing new API routes; modifying existing route behaviour; keeping `docs/api-routes.md` current |
| `frontend-reviewer` | Code review of React components, Tailwind, TypeScript types, hydration safety, and accessibility |
| `backend-reviewer` | Code review of API routes, auth logic, middleware, external API integrations, and error handling |
| `database-engineer` | Schema design review, query efficiency, indexing strategy, N+1 risks, and Prisma/libsql compatibility |
| `data-safety-expert` | GDPR/UK GDPR compliance audit — data collected, retention, subject rights, third-party processors, consent |
| `ui-designer` | Design decisions for new or existing UI — layout, visual hierarchy, interaction patterns, mobile responsiveness, emotional tone, and accessibility. Invoke before implementing any new page or component, or when evaluating UX quality |

### Built-in agents

| Agent | When to use |
|-------|-------------|
| `Explore` | Searching the codebase before making changes — finding existing patterns, tracing data flow, locating files |
| `Plan` | Designing an implementation approach for non-trivial features before writing code |
| `Bash` | Running commands where output is verbose and doesn't need to stay in context (`npm run build`, git ops) |

**Rule of thumb**: if a task is exploratory or isolated, delegate it. Keep the main conversation for decisions and cross-cutting changes.

## Session Round-up

1. **Update docs** — update `CLAUDE.md` and any relevant `docs/*.md` files to reflect your changes.
2. **Commit when done** — commit all changes with a clear message.
