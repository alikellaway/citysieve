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

## Auth pattern for survey routes

The middleware at `src/middleware.ts` (`export { auth as middleware }`) attaches the auth session to all `/api/survey/*` routes. Each route then checks `session?.user?.id` and returns 401 if absent. Auth is optional for the survey UI — users can complete the survey and see results without signing in. Auth only gates saving/loading surveys.
