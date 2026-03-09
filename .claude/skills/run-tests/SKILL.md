---
name: run-tests
description: Run the CitySieve unit/API test suite with Vitest and optionally Playwright e2e tests. Triggered by phrases like "run the tests", "run unit tests", "test this", or "check if tests pass".
---

# Run Unit Tests

When the user asks to "run the tests", "run unit tests", "check if tests pass", or similar:

## Test infrastructure

| Tool | Config file | Test directory | Command |
|------|-------------|----------------|---------|
| Vitest | `vitest.config.ts` | `tests/` | `npm test` (single run), `npm run test:watch` (watch mode) |
| Playwright | `playwright.config.ts` | `e2e/` | `npm run test:e2e` |

Vitest config uses the `node` environment, `@vitejs/plugin-react`, and the `@` path alias pointing to `./src`.

## Test directory layout

```
tests/
  api/            ← API route handler tests (mock auth, prisma, fetch)
  hooks/          ← React hook tests (jsdom via inline config)
  unit/
    data/         ← Area generator, data layer
    scoring/      ← Scoring engine, weights, filters, commute, price
    survey/       ← Survey schema, reducer, quick defaults
    rate-limit.test.ts
    security-headers.test.ts
e2e/              ← Playwright browser tests (require a running server)
```

## Common patterns in existing tests

1. **API route tests** import the handler directly and construct `NextRequest` objects:
   ```ts
   import { GET } from '@/app/api/some-route/route';
   import { NextRequest } from 'next/server';
   const req = new NextRequest('http://localhost/api/some-route?param=value');
   const res = await GET(req);
   expect(res.status).toBe(200);
   ```

2. **Mocking auth** — every authenticated route mocks `@/lib/auth`:
   ```ts
   vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
   import { auth } from '@/lib/auth';
   (auth as any).mockResolvedValueOnce({ user: { id: 'user_1' } });
   ```

3. **Mocking Prisma** — mock `@/lib/db` with only the models/methods needed:
   ```ts
   vi.mock('@/lib/db', () => ({
     prisma: { savedSurvey: { create: vi.fn(), findMany: vi.fn() } },
   }));
   ```

4. **Mocking fetch** (Overpass, geocode routes):
   ```ts
   const mockFetch = vi.fn();
   global.fetch = mockFetch;
   ```

5. **Mocking the rate limiter** — use `vi.hoisted` so the mock fn is available inside the hoisted `vi.mock` factory:
   ```ts
   const { mockCheck } = vi.hoisted(() => ({
     mockCheck: vi.fn().mockReturnValue(true),
   }));
   vi.mock('@/lib/rate-limit', () => ({
     RateLimiter: class { check = mockCheck; },
   }));
   ```

6. **React hook tests** use jsdom via an inline `// @vitest-environment jsdom` directive at the top of the file.

## Steps

### Run all unit + API tests (default)

```bash
npm test
```

This runs `vitest run` — a single pass of every `tests/**/*.{test,spec}.{ts,tsx}` file.

### Run a specific test file

```bash
npx vitest run tests/api/overpass.test.ts
```

### Run tests matching a name pattern

```bash
npx vitest run -t "returns 429"
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run tests with coverage

```bash
npm run test:coverage
```

Coverage thresholds (80% lines/functions/branches/statements) apply to `src/lib/scoring/**` and `src/lib/survey/**` only. The report is written to `coverage/`.

### Run Playwright e2e tests

Requires a built app or running dev server on port 3000.

```bash
npm run test:e2e
```

## After running tests

- If all tests pass, report the total count (e.g. "143 tests across 23 files — all green").
- If tests fail, list each failing test name and file, then investigate and fix.
- When fixing a failure, re-run only the affected file first (`npx vitest run <file>`) before running the full suite to save time.

## Writing new tests

- Place API route tests in `tests/api/<route-name>.test.ts`.
- Place pure logic unit tests in `tests/unit/<domain>/`.
- Place React hook tests in `tests/hooks/`.
- Always `vi.clearAllMocks()` in `beforeEach`.
- Use `vi.useFakeTimers()` / `vi.useRealTimers()` for time-dependent tests.
- Never import route handlers before `vi.mock()` calls — use dynamic `await import()` if the module instantiates mocked dependencies at the top level.
