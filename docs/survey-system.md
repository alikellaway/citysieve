# Survey System

## Types (`src/lib/survey/types.ts`)

All types used across the app are defined here. Read this file first when working on survey changes.

**Type enums are string unions**, not TypeScript `enum`s:
- `AgeRange`, `TenureType`, `HouseholdType`, `CommuteMode`, `ChildrenStatus`, `SchoolPriority`, `CarOwnership`, `AreaType`, `DevelopmentFeeling`, `CycleFrequency`
- `LikertValue` = `1 | 2 | 3 | 4 | 5`

**Step interfaces**: `ProfileStep`, `CommuteStep`, `FamilyStep`, `LifestyleStep`, `TransportStep`, `EnvironmentStep`

**Top-level state**: `SurveyState` — contains all 6 step interfaces + `currentStep: number`

## Steps (`src/lib/survey/steps.ts`)

`SURVEY_STEPS` array defines the 6 steps with `id`, `name`, `path`, and `number`. `TOTAL_STEPS = 6`.

| # | ID | Path | Step interface |
|---|-----|------|---------------|
| 1 | profile | /survey/profile | ProfileStep |
| 2 | commute | /survey/commute | CommuteStep |
| 3 | family | /survey/family | FamilyStep |
| 4 | lifestyle | /survey/lifestyle | LifestyleStep |
| 5 | transport | /survey/transport | TransportStep |
| 6 | environment | /survey/environment | EnvironmentStep |

## State management (`src/lib/survey/context.tsx`)

Uses React Context + `useReducer`. State is initialized from `localStorage` (key: `'cityseive-survey-state'`) and persisted on every change via `useEffect`.

### Reducer actions

| Action | Payload | Effect |
|--------|---------|--------|
| `UPDATE_PROFILE` | `Partial<ProfileStep>` | Merges into `state.profile` |
| `UPDATE_COMMUTE` | `Partial<CommuteStep>` | Merges into `state.commute` |
| `UPDATE_FAMILY` | `Partial<FamilyStep>` | Merges into `state.family` |
| `UPDATE_LIFESTYLE` | `Partial<LifestyleStep>` | Merges into `state.lifestyle` |
| `UPDATE_TRANSPORT` | `Partial<TransportStep>` | Merges into `state.transport` |
| `UPDATE_ENVIRONMENT` | `Partial<EnvironmentStep>` | Merges into `state.environment` |
| `SET_STEP` | `number` | Sets `currentStep` (drives progress bar) |
| `RESET` | none | Returns to `initialState` |
| `LOAD_STATE` | `SurveyState` | Replaces entire state (used to restore saved surveys) |

### `useSurvey` hook (`src/hooks/useSurvey.ts`)

Wraps the context and exposes memoized helpers:
- `state` — current `SurveyState`
- `updateProfile(partial)`, `updateCommute(partial)`, etc. — one per step
- `setStep(n)` — sets the progress bar step
- `reset()` — clears state
- `loadState(fullState)` — restores a saved survey from the database

## Validation (`src/lib/survey/schema.ts`)

Zod schemas for each step: `profileSchema`, `commuteSchema`, `familySchema`, `lifestyleSchema`, `transportSchema`, `environmentSchema`.

Notable refinements:
- `commuteSchema` — requires at least one commute mode if `daysPerWeek > 0`
- `familySchema` — requires `schoolPriority` when `childrenStatus !== 'no'`

## How to add a new survey step

1. Add a new step interface to `src/lib/survey/types.ts`
2. Add the field to `SurveyState`
3. Add `UPDATE_NEWSTEP` action + reducer case in `src/lib/survey/context.tsx` (include default values in `initialState`)
4. Add `updateNewStep` helper to `src/hooks/useSurvey.ts`
5. Add Zod schema to `src/lib/survey/schema.ts`
6. Add entry to `SURVEY_STEPS` in `src/lib/survey/steps.ts` (update `number` values for all subsequent steps)
7. Create `src/app/survey/newstep/page.tsx` following the survey page pattern (see [architecture.md](./architecture.md))
8. Update `StepNavigation` prev/next links if needed
9. Update the review page (`src/app/survey/review/page.tsx`) to display the new step
10. Update scoring weights/filters if the new step feeds into scoring
