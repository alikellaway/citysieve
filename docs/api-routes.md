# API Routes

All routes are in `src/app/api/`.

## GET /api/geocode

Proxies requests to OpenStreetMap Nominatim.

- **Auth**: None
- **Query params**: `q` (search string or "lat,lng" for reverse geocoding)
- **Response**: JSON array of Nominatim results
- **Caching**: In-memory Map, 24h TTL, keyed by lowercase query
- **Headers**: Sends `User-Agent: CitySieve/1.0` to Nominatim

## GET /api/overpass

Proxies amenity queries to the Overpass API.

- **Auth**: None
- **Query params**: `lat`, `lng`, `radius` (default 1000m)
- **Response**: JSON object with amenity counts:
  ```json
  {
    "supermarkets": 3, "highStreet": 12, "pubsBars": 5,
    "restaurantsCafes": 8, "parksGreenSpaces": 2, "gymsLeisure": 1,
    "healthcare": 3, "librariesCulture": 1, "trainStation": 1, "busStop": 6
  }
  ```
- **Caching**: In-memory Map, 24h TTL, keyed by rounded coordinates (~500m precision via `Math.round(n * 200) / 200`)
- **Rate limiting**: Returns 429 if Overpass returns non-JSON (its rate-limit signal). The results page handles this with retries.

## GET /api/overpass/pois

Fetches individual amenity POIs (points of interest) for the area modal map.

- **Auth**: None
- **Query params**: `lat`, `lng`, `radius` (default 1000m)
- **Response**: JSON array of POI objects:
  ```json
  [
    { "id": 123456, "lat": 51.5074, "lng": -0.1278, "name": "Tesco Express", "type": "Supermarket", "category": "supermarkets" },
    { "id": 789012, "lat": 51.5080, "lng": -0.1285, "name": "The Crown", "type": "Pub", "category": "pubsBars" }
  ]
  ```
- **Categories**: `supermarkets`, `pubsBars`, `restaurantsCafes`, `parksGreenSpaces`, `gymsLeisure`, `healthcare`, `librariesCulture`, `trainStation`, `busStop`
- **Caching**: In-memory Map, 24h TTL, same coordinate rounding as `/api/overpass`
- **Types**: See `src/lib/poi-types.ts` for `Poi`, `AmenityCategory`, `CATEGORY_CONFIG`

## GET /api/auth/[...nextauth]
## POST /api/auth/[...nextauth]

NextAuth v5 handler. Delegates to the config in `src/lib/auth.ts`.

- **Auth**: Managed by NextAuth
- See [auth-database.md](./auth-database.md) for config details

## POST /api/survey/save

Saves a survey to the database.

- **Auth**: Required (checks `session.user.id`, returns 401)
- **Body**: `{ state: SurveyState, label?: string }`
- **Response**: `{ id: string }`
- **Note**: Survey state is stored as `JSON.stringify(state)` in the `SavedSurvey.state` column

## GET /api/survey/list

Lists the authenticated user's saved surveys.

- **Auth**: Required
- **Response**: Array of `{ id, label, createdAt, updatedAt }` ordered by `updatedAt desc`

## GET /api/survey/[id]

Retrieves a single saved survey.

- **Auth**: Required (scoped to user — queries by both `id` and `userId`)
- **Response**: Full `SavedSurvey` object with `state` parsed from JSON

## DELETE /api/survey/[id]

Deletes a single saved survey.

- **Auth**: Required (scoped to user)
- **Response**: `{ success: true }`

## GET /api/account

Returns account preferences for the authenticated user.

- **Auth**: Required (returns 401 if unauthenticated)
- **Response**: `{ emailOptIn: boolean }`

## PATCH /api/account

Updates account preferences.

- **Auth**: Required
- **Body**: `{ emailOptIn: boolean }`
- **Response**: `{ success: true }`

## DELETE /api/account

Permanently deletes the authenticated user's account (cascades to Account, Session, SavedSurvey rows).

- **Auth**: Required
- **Response**: `{ success: true }` — client should call `signOut()` on success

## GET /api/admin/analytics

Returns `SurveyAnalytics` rows for analysis. Intended for use by Claude agents and the project owner — not exposed to end users.

- **Auth**: `Authorization: Bearer <ANALYTICS_API_KEY>` header required. Key is set in `.env.local` (dev) and `.env.production` (prod). Returns 401 if missing or wrong.
- **Query params**:
  - `limit` — max rows to return (default 200, hard cap 1000)
  - `offset` — pagination offset (default 0)
  - `since` — ISO date string to filter by `createdAt >=` (e.g. `2026-01-01`)
- **Response**:
  ```json
  {
    "count": 42,
    "offset": 0,
    "limit": 200,
    "rows": [{ "id", "createdAt", "userId", "surveyMode", "surveyState", "topResults", "totalCandidates", "rejectedCount", "passedCount", "radiusKm" }]
  }
  ```
  `surveyState` and `topResults` are pre-parsed from JSON strings into objects.
- **Usage**: See the `analytics-analyst` skill for ready-to-run `curl` + `jq` analysis patterns.

## POST /api/analytics/survey-run

Records an analytics snapshot at the end of every survey run. Fired as a background (fire-and-forget) fetch from the results page immediately after results are displayed.

- **Auth**: Optional — captures `userId` if the user is signed in, otherwise records `null`
- **Body**:
  ```json
  {
    "surveyMode": "full" | "quick" | null,
    "surveyState": { ...SurveyState },
    "topResults": [{ "name", "outcode", "score", "coordinates", "highlights", "commuteEstimate" }],
    "totalCandidates": 180,
    "rejectedCount": 42,
    "passedCount": 128,
    "radiusKm": 20
  }
  ```
- **Response**: `{ success: true }` (always 200 — errors are swallowed to avoid console noise on the client)
- **Privacy**: Server strips `workLocation.label` and `familyLocation.label` before persisting; coordinates are rounded to 3 decimal places (~100m precision)
- **Validation**: Zod schema validated on the server — invalid payloads return 400 but are otherwise ignored by the client
- **Storage**: Writes to the `SurveyAnalytics` table in SQLite — see the `analytics-analyst` skill for query patterns

## Auth pattern for survey routes

The middleware at `src/middleware.ts` checks for the existence of the `authjs.session-token` cookie on all `/api/survey/*` routes. Each route then calls `await auth()` for the authoritative session check. Auth is optional for the survey UI — users can complete the survey and see results without signing in. Auth only gates saving/loading surveys.
