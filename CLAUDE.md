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
