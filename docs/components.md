# Components

All components are in `src/components/`.

## Layout

### `SiteHeader` (`layout/SiteHeader.tsx`)
- Used on: landing page, survey layout, results page, my-surveys page
- Contains: logo link (`/`) + `ThemeToggle` + `AuthButton`
- The survey layout adds it automatically — don't duplicate it in survey step pages or the review page

### `ThemeToggle` (`ThemeToggle.tsx`)
- Client component. Three-option dropdown: Light / Dark / System (default)
- Uses `useTheme()` from `next-themes`; icons: Sun / Moon / Monitor from `lucide-react`
- Renders a placeholder `<div>` before mount to avoid hydration mismatches
- Placed in `SiteHeader` adjacent to `AuthButton`

### `SessionProvider` (`providers/SessionProvider.tsx`)
- NextAuth `SessionProvider` wrapper (client component)
- Mounted inside `Providers` in root layout — wraps the entire app

## Auth

### `AuthButton` (`auth/AuthButton.tsx`)
- Shows loading skeleton → signed-in state → sign-in button
- **Signed-in state**: avatar dropdown trigger + name (hidden on mobile) + Sign out button
- **Dropdown**: user name/email header label, "Survey History" → `/my-surveys`, "Account Settings" → `/account`
- Uses `useSession()`, `signIn('google')`, `signOut()`, `useRouter()`

## Ads

### `AdSlot` (`ads/AdSlot.tsx`)
- Server component. Renders a Google AdSense `<ins>` unit when both `NEXT_PUBLIC_ADSENSE_PUB_ID` and the variant-specific slot ID env var are set. Falls back to a placeholder box otherwise, so layout is unchanged in development.
- **Props**: `variant` ('inline' | 'leaderboard' | 'rectangle'), `className`
- **Responsive sizes** (used by the placeholder; AdSense auto-sizes via `data-ad-format="auto"` in the real path):
  - `inline`: 320×50 (mobile) → 728×90 (tablet/desktop) — between content cards
  - `leaderboard`: 320×50 (mobile) → 728×90 (tablet) → 970×90 (desktop) — full-width page placements
  - `rectangle`: 300×250 (all breakpoints) — fixed MREC
- **Real ad path**: Renders `<ins class="adsbygoogle" data-ad-client={PUB_ID} data-ad-slot={slotId} data-ad-format="auto" data-full-width-responsive="true" />` plus `<AdSlotPusher />` to call `adsbygoogle.push({})`
- **Env vars required** (baked in at Docker build time):
  - `NEXT_PUBLIC_ADSENSE_PUB_ID` — your AdSense publisher ID (`ca-pub-XXXXXXXXXXXXXXXXX`)
  - `NEXT_PUBLIC_ADSENSE_SLOT_INLINE` — ad unit slot ID for the inline variant
  - `NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD` — ad unit slot ID for the leaderboard variant
  - `NEXT_PUBLIC_ADSENSE_SLOT_RECTANGLE` — ad unit slot ID for the rectangle variant
- **Placements**:
  - Landing page: `leaderboard` below the hero CTA
  - Results page: `inline` after every 3rd result card (suppressed at ring boundaries); `rectangle` before action buttons
  - Area modal: `rectangle` at the bottom of the right panel — only when `NEXT_PUBLIC_SPONSORED_URL` is not set (sponsored slot takes priority)
- **AdSense global script**: Loaded via `<Script>` in `layout.tsx` — only injected when `NEXT_PUBLIC_ADSENSE_PUB_ID` is set

### `AdSlotPusher` (`ads/AdSlotPusher.tsx`)
- Thin `'use client'` component that calls `window.adsbygoogle.push({})` in a `useEffect`
- Kept separate from `AdSlot` so `AdSlot` can remain a server component — avoids making the landing page or any other parent a client component
- Renders `null` (no DOM output); only exists to trigger the AdSense initialisation side-effect
- Errors from duplicate push calls (common in HMR) are silently swallowed

## Donation

### `DonateButton` (`donate/DonateButton.tsx`)
- Buy Me a Coffee link styled as a button
- **Props**: `className`
- Reads `NEXT_PUBLIC_BMAC_USERNAME` env var; renders nothing if unset
- Used on: landing page, results page

## Survey components (`survey/`)

### `StepNavigation` — prev/next buttons at the bottom of each step
### `ProgressBar` — shows current step progress, driven by `currentStep` from survey state
### `LikertScale` — 1-5 importance selector used across lifestyle/transport/environment steps
### `AmenityRatingGrid` — grid of `LikertScale` controls for the lifestyle step
### `BudgetSlider` — budget input for profile step
### `LocationAutocomplete` — geocoding search input. Debounces the query string via `useDebounce` and triggers search via `useEffect`
### `TagInput` — tag input for exclude/considering areas in environment step

- **Props**: `value: string[]`, `onChange: (tags: string[]) => void`, `label: string`, `placeholder?: string`, `enableAutocomplete?: boolean`
- Renders a chip-style tag input where Enter adds a tag and Backspace removes the last tag
- **`enableAutocomplete`** (default `false`): when true, debounces typed input (400ms, min 3 chars) and calls `GET /api/geocode?q=...&countrycodes=gb` to fetch Nominatim suggestions
  - Displays a dropdown of up to 5 results; selecting one adds the **first comma-delimited segment** of `display_name` as the tag (e.g. `"Hackney"` from `"Hackney, London Borough of Hackney, ..."`)
  - Arrow keys navigate the dropdown; Enter selects; Escape dismisses
  - Falls back to plain Enter-to-add if suggestions are not shown
- Used in the environment step for both `excludeAreas` and `consideringAreas` fields with `enableAutocomplete` enabled

## Results components (`results/`)

### `ResultCard` (`results/ResultCard.tsx`)
- **Props**: `result: ScoredArea`, `rank: number`, `isActive: boolean`, `isHovered: boolean`, `onClick: () => void`, `onHover: () => void`, `onLeave: () => void`, `onExplore: () => void`
- Displays rank badge (colour-coded by tier), area name, score percentage, highlight badges, and an "Explore area →" button
- **Rank badge colours**: 1–3 green, 4–7 amber, 8+ slate — matches map pin colours
- `onClick` activates the map pin; `onHover`/`onLeave` control hover highlighting
- `onExplore` opens the `AreaInfoModal` (button uses `stopPropagation` so both don't fire)
- **Visual states**: `isActive` shows strong ring; `isHovered` (when not active) shows subtle ring
- Highlights map internal keys to friendly labels via `HIGHLIGHT_LABELS` lookup
- **Score breakdown**: Collapsed by default; click "▼ Score breakdown" to expand. Shows horizontal bars for each dimension where the user's weight > 0, sorted by descending weighted contribution (weight × score). Uses `ScoredArea.weights` and `ScoredArea.breakdown`

### `AreaInfoModal` (`results/AreaInfoModal.tsx`)
- **Props**: `area: ScoredArea | null`, `onClose: () => void`
- Renders nothing when `area` is null; otherwise opens a shadcn `Dialog`
- **Layout**: `max-w-3xl` two-column layout (map left, info right on desktop; stacked on mobile)
- **Header**: area name + match score badge + environment type + commute toggle
- **Map panel**: `AreaModalMap` component showing clustered amenity markers within 1km radius
- **Amenity panel**: `AmenityGrid` showing count tiles per category + filter chips
- **Resource link grid (2×3)**: Google Maps, Street View, Rightmove, Zoopla, Schools (DfE), Crime stats — all open in new tab
- **Awin affiliate wrapping**: When `NEXT_PUBLIC_AWIN_ID` is set, Rightmove (mid 2047) and Zoopla (mid 2623) links are wrapped via `awin1.com`
- **Sponsored slot**: Rendered only when `NEXT_PUBLIC_SPONSORED_URL` is set; shows a "Sponsored" chip, sponsor name (`NEXT_PUBLIC_SPONSORED_LABEL`), tagline (`NEXT_PUBLIC_SPONSORED_TEXT`), and link
- **AdSense rectangle**: Rendered at the bottom of the right panel only when `NEXT_PUBLIC_SPONSORED_URL` is **not** set and `NEXT_PUBLIC_ADSENSE_PUB_ID` is set — the sponsored slot always takes priority

### `AreaModalMap` (`results/AreaModalMap.tsx`)
- **Props**: `center: { lat, lng }`, `pois: Poi[]`, `activeFilter: AmenityCategory | 'all'`, `onPoiClick?: (poi: Poi) => void`
- Leaflet map with CartoDB tiles + clustered markers for amenity POIs
- **Must be dynamically imported** with `ssr: false` — Leaflet requires `window`
- **Markers**: Circular div icons, colour-coded by category (see `CATEGORY_CONFIG` in `src/lib/poi-types.ts`)
- **Clustering**: Uses `leaflet.markercluster` — groups nearby markers with count badge
- **Popups**: Click a marker to see name, type, and "Open in Google Maps" link
- **Filtering**: `activeFilter` prop controls which markers are shown; pass `'all'` to show all

### `AmenityGrid` (`results/AmenityGrid.tsx`)
- **Props**: `pois: Poi[]`, `activeFilter: AmenityCategory | 'all'`, `onFilterChange: (filter: AmenityCategory | 'all') => void`
- Displays amenity counts in a 3-column grid with category icons
- Clicking a category tile filters the map to show only that amenity type
- Horizontal filter chips show counts and allow quick filtering

### `ResultMap` (`results/ResultMap.tsx`)
- **Props**: `results: ScoredArea[]`, `activeIndex: number | null`, `hoverIndex: number | null`, `onMarkerClick: (index: number) => void`, `onMarkerHover: (index: number | null) => void`
- Leaflet `MapContainer` with CartoDB tile layer + custom `divIcon` markers per result
- **Tile layers**: CartoDB Positron (light) / CartoDB Dark Matter (dark) — selected via `useTheme().resolvedTheme`. `key={tile.url}` forces Leaflet to swap layers when theme changes
- **Pin design**: SVG teardrop with rank number displayed; colour-coded by tier (1–3 green, 4–7 amber, 8+ slate) — colours shared via `rankColors.ts`
- **Pin states**: default (28px), hover (32px), active (36px) — hover and active grow the pin
- `FlyToActive` sub-component pans the map to the active pin on click
- **Hover linking**: mouseover on pin or card highlights both; `hoverIndex` drives the sync
- **Must be dynamically imported** with `ssr: false` — Leaflet requires `window`

### `rankColors` (`results/rankColors.ts`)
- Shared utility: `getRankColor(rank: number): string`
- Returns `#22c55e` (green-500) for ranks 1–3, `#f59e0b` (amber-500) for 4–7, `#94a3b8` (slate-400) for 8+
- Imported by both `ResultCard` and `ResultMap` to keep badge and pin colours in sync

### `LoadingMap` (`results/LoadingMap.tsx`)
- Full-screen animated map shown during the search/analysis phase
- **Props**: `centre: { lat, lng }`, `candidates: CandidateArea[]`, `status: Map<string, CandidateStatus>`, `activeIndex: number | null`, `onMapReady?: (map: L.Map) => void`
- **CandidateStatus**: `'pending' | 'checking' | 'checked' | 'passed' | 'filtered'`
- **CircleMarker** for each candidate with status-based styling:
  - `pending`: gray (#64748b), 40% opacity — not yet fetched
  - `checking`: violet (#8b5cf6), 100% opacity — currently fetching
  - `checked`: slate (#94a3b8), 60% opacity — fetched, awaiting final score
  - `passed`: green (#22c55e), 80% opacity — passed filters
  - `filtered`: translucent red (#ef4444), 40% opacity — filtered out
- `FlyToCandidate` sub-component pans the map to each candidate as it's checked
- **Must be dynamically imported** with `ssr: false` — Leaflet requires `window`

### `LoadingOverlay` (`results/LoadingOverlay.tsx`)
- Bottom-center floating info panel shown during loading
- **Props**: `areaName: string | null`, `phrase: string`
- Shows 📍 icon + current area name, plus a fun micro-copy phrase
- Frosted glass effect via `backdrop-blur-md`

### `LoadingProgressBar` (`results/LoadingProgressBar.tsx`)
- Slim full-width progress bar positioned below the header
- **Props**: `done: number`, `total: number`
- Gradient fill (indigo → violet) with animated dot at current position
- Shows percentage on the right

## UI primitives (`ui/`)

shadcn/ui components built on Radix + CVA + `cn()`:
- `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `progress`, `radio-group`, `select`, `slider`, `toggle-group`, `tooltip`
- **Do not modify** these unless fixing a bug
