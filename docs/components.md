# Components

All components are in `src/components/`.

## Layout

### `SiteHeader` (`layout/SiteHeader.tsx`)
- Used on: landing page, survey layout, results page, my-surveys page
- Contains: logo link (`/`) + `AuthButton`
- The survey layout adds it automatically — don't duplicate it in survey step pages or the review page

### `SessionProvider` (`providers/SessionProvider.tsx`)
- NextAuth `SessionProvider` wrapper (client component)
- Mounted in root layout — wraps the entire app

## Auth

### `AuthButton` (`auth/AuthButton.tsx`)
- Shows loading skeleton → signed-in state (avatar + name + sign out) → sign-in button
- Uses `useSession()`, `signIn('google')`, `signOut()`

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
### `TagInput` — free-text tag input for exclude/considering areas in environment step

## Results components (`results/`)

### `ResultCard` (`results/ResultCard.tsx`)
- **Props**: `result: ScoredArea`, `rank: number`, `isActive: boolean`, `onClick: () => void`, `onExplore: () => void`
- Displays rank badge, area name, score percentage, highlight badges, and an "Explore area →" button
- `onClick` activates the map pin; `onExplore` opens the `AreaInfoModal` (button uses `stopPropagation` so both don't fire)
- Highlights map internal keys to friendly labels via `HIGHLIGHT_LABELS` lookup

### `AreaInfoModal` (`results/AreaInfoModal.tsx`)
- **Props**: `area: ScoredArea | null`, `onClose: () => void`
- Renders nothing when `area` is null; otherwise opens a shadcn `Dialog`
- **Header**: area name + match score badge
- **Quick stats**: environment type label, commute estimate (if present)
- **Resource link grid (2×3)**: Google Maps, Street View, Rightmove, Zoopla, Schools (DfE), Crime stats — all open in new tab
- **Awin affiliate wrapping**: When `NEXT_PUBLIC_AWIN_ID` is set, Rightmove (mid 2047) and Zoopla (mid 2623) links are wrapped via `awin1.com`
- **Sponsored slot**: Rendered only when `NEXT_PUBLIC_SPONSORED_URL` is set; shows a "Sponsored" chip, sponsor name (`NEXT_PUBLIC_SPONSORED_LABEL`), tagline (`NEXT_PUBLIC_SPONSORED_TEXT`), and link

### `ResultMap` (`results/ResultMap.tsx`)
- **Props**: `results: ScoredArea[]`, `activeIndex: number | null`, `onMarkerClick: (index: number) => void`
- Leaflet `MapContainer` with `TileLayer` (OSM) + `Marker` per result
- Active marker uses a larger icon; `FlyToActive` sub-component pans the map
- **Must be dynamically imported** with `ssr: false` — Leaflet requires `window`

## UI primitives (`ui/`)

shadcn/ui components built on Radix + CVA + `cn()`:
- `badge`, `button`, `card`, `dialog`, `input`, `label`, `progress`, `radio-group`, `select`, `slider`, `toggle-group`, `tooltip`
- **Do not modify** these unless fixing a bug
