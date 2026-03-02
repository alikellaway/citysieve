# Auth & Database

## NextAuth v5 config (`src/lib/auth.ts`)

- **Provider**: Google OAuth (requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in env)
- **Secret**: NextAuth v5 reads `AUTH_SECRET` (not the v4 `NEXTAUTH_SECRET`)
- **Adapter**: `@auth/prisma-adapter` — stores users/sessions/accounts in SQLite
- **Session strategy**: `database` (not JWT) — every session check hits SQLite
- **Callbacks**: `session` callback injects `user.id` into the session object
- **Exports**: `handlers`, `auth`, `signIn`, `signOut`

## Session type augmentation (`src/types/next-auth.d.ts`)

Extends the NextAuth `Session` type so `session.user.id` is typed as `string`.

## Client-side auth

- `SessionProvider` (`src/components/providers/SessionProvider.tsx`) wraps the app in root layout
- Use `useSession()` from `next-auth/react` in client components
- `AuthButton` (`src/components/auth/AuthButton.tsx`) handles sign in/out UI — avatar opens a dropdown with Survey History and Account Settings links
- `AccountPage` (`src/app/account/page.tsx`) — account settings: read-only profile, emailOptIn toggle, delete account with confirmation dialog

## Server-side auth

- Use `auth()` from `@/lib/auth` in API routes
- Survey API routes check `session?.user?.id` and return 401 if absent

## Prisma setup

### Client singleton (`src/lib/db.ts`)

- Imports `PrismaClient` from `@/generated/prisma/client` (Prisma 7 with custom output path)
- Uses `PrismaLibSql` adapter from `@prisma/adapter-libsql` — Prisma 7 requires a driver adapter instead of a raw connection string in the constructor
- Uses global singleton pattern to avoid multiple clients in dev (hot reload)

### Prisma config (`prisma.config.ts`)

- Prisma 7 moved datasource URL out of `schema.prisma` and into `prisma.config.ts`
- `DATABASE_URL` is read here (via `dotenv/config`) for migrations and Prisma Studio
- **Do not add `url` to `schema.prisma`** — Prisma 7 will error if you do

### Schema (`prisma/schema.prisma`)

6 models:

| Model | Purpose |
|-------|---------|
| `User` | User profile (name, email, image, emailOptIn). Has many Accounts, Sessions, SavedSurveys |
| `Account` | OAuth provider link (Google). Unique on `[provider, providerAccountId]` |
| `Session` | Database session. Unique on `sessionToken` |
| `VerificationToken` | Email verification (unused currently). Unique on `[identifier, token]` |
| `SavedSurvey` | Stored survey state as JSON string. Belongs to User. Indexed on `userId` |
| `SurveyAnalytics` | Implicit analytics record per survey run. No FK to User — `userId` is nullable (anonymous users). See `analytics-analyst` skill for query patterns |

### Database

- **Provider**: SQLite via libsql adapter (file: `dev.db` in project root)
- **To swap databases**: Change `provider` in `schema.prisma`, update `DATABASE_URL`, install the appropriate Prisma 7 adapter, and update `db.ts`.

### Commands

```bash
npx prisma migrate dev    # Run migrations
npx prisma generate       # Regenerate client after schema changes
npx prisma studio         # Database GUI
```
