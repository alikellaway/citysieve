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
- Placeholder ad component using CVA variants
- **Props**: `size` ('banner' | 'rectangle' | 'leaderboard'), `className`
- Sizes: banner=728x90, rectangle=300x250, leaderboard=full-width x 90
- Used on: landing page, between result cards (every 3rd)
- To add real ads: replace the inner content with the ad provider's script; sizing/positioning stays the same

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
- **Header**: area name + match score badge
- **Quick stats**: environment type label, commute estimate (if present). The commute estimate pill is a toggle button — clicking it expands an inline breakdown showing estimated minutes per commute mode the user selected (Car / Train / Bus / Cycling / Walking). The breakdown collapses when a different area is opened.
- **Resource link grid (2×3)**: Google Maps, Street View, Rightmove, Zoopla, Schools (DfE), Crime stats — all open in new tab
- **Awin affiliate wrapping**: When `NEXT_PUBLIC_AWIN_ID` is set, Rightmove (mid 2047) and Zoopla (mid 2623) links are wrapped via `awin1.com`
- **Sponsored slot**: Rendered only when `NEXT_PUBLIC_SPONSORED_URL` is set; shows a "Sponsored" chip, sponsor name (`NEXT_PUBLIC_SPONSORED_LABEL`), tagline (`NEXT_PUBLIC_SPONSORED_TEXT`), and link

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

## UI primitives (`ui/`)

shadcn/ui components built on Radix + CVA + `cn()`:
- `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `progress`, `radio-group`, `select`, `slider`, `toggle-group`, `tooltip`
- **Do not modify** these unless fixing a bug
