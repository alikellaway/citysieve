# Auth & Database

## NextAuth v5 config (`src/lib/auth.ts`)

- **Provider**: Google OAuth (requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in env)
- **Adapter**: `@auth/prisma-adapter` — stores users/sessions/accounts in SQLite
- **Session strategy**: `database` (not JWT) — every session check hits SQLite
- **Callbacks**: `session` callback injects `user.id` into the session object
- **Exports**: `handlers`, `auth`, `signIn`, `signOut`

## Session type augmentation (`src/types/next-auth.d.ts`)

Extends the NextAuth `Session` type so `session.user.id` is typed as `string`.

## Client-side auth

- `SessionProvider` (`src/components/providers/SessionProvider.tsx`) wraps the app in root layout
- Use `useSession()` from `next-auth/react` in client components
- `AuthButton` (`src/components/auth/AuthButton.tsx`) handles sign in/out UI

## Server-side auth

- Use `auth()` from `@/lib/auth` in API routes
- Survey API routes check `session?.user?.id` and return 401 if absent

## Prisma setup

### Client singleton (`src/lib/db.ts`)

- Imports from `@/generated/prisma` (Prisma v7 with custom output path)
- Uses global singleton pattern to avoid multiple clients in dev (hot reload)
- Resolves relative `file:./` SQLite paths from `process.cwd()`

### Schema (`prisma/schema.prisma`)

5 models:

| Model | Purpose |
|-------|---------|
| `User` | User profile (name, email, image). Has many Accounts, Sessions, SavedSurveys |
| `Account` | OAuth provider link (Google). Unique on `[provider, providerAccountId]` |
| `Session` | Database session. Unique on `sessionToken` |
| `VerificationToken` | Email verification (unused currently). Unique on `[identifier, token]` |
| `SavedSurvey` | Stored survey state as JSON string. Belongs to User. Indexed on `userId` |

### Database

- **Provider**: SQLite (file: `dev.db` in project root)
- **To swap databases**: Change `provider` in `prisma/schema.prisma` and `DATABASE_URL` in env. Prisma handles the rest.

### Commands

```bash
npx prisma migrate dev    # Run migrations
npx prisma generate       # Regenerate client after schema changes
npx prisma studio         # Database GUI
```
