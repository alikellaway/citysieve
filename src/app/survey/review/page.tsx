'use client';

import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { useSurvey } from '@/hooks/useSurvey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SurveyState } from '@/lib/survey/types';

const LIKERT_LABELS: Record<number, string> = {
  1: 'Not important',
  2: 'Slightly',
  3: 'Moderate',
  4: 'Important',
  5: 'Very important',
};

function likert(val: number) {
  return `${val}/5 — ${LIKERT_LABELS[val] ?? ''}`;
}

function formatBudget(budget: number | null, tenure: string | null) {
  if (budget === null) return 'Not set';
  if (tenure === 'rent') return `\u00A3${budget.toLocaleString()}/mo`;
  return `\u00A3${budget.toLocaleString()}`;
}

const LABEL_MAPS = {
  ageRange: { '18-24': '18-24', '25-34': '25-34', '35-44': '35-44', '45-54': '45-54', '55-64': '55-64', '65+': '65+' },
  tenureType: { buy: 'Buy', rent: 'Rent', not_sure: 'Not sure yet' },
  householdType: { alone: 'Alone', with_partner: 'With partner', with_family: 'With family', house_share: 'House share' },
  childrenStatus: { no: 'No children', under_5: 'Under 5', school_age: 'School age', both: 'Both' },
  schoolPriority: { primary: 'Primary', secondary: 'Secondary', both: 'Both', not_important: 'Not important' },
  carOwnership: { yes: 'Yes', no: 'No', considering: 'Considering' },
  cycleFrequency: { yes: 'Yes, regularly', sometimes: 'Sometimes', no: 'No' },
  areaType: { city_centre: 'City centre', inner_suburb: 'Inner suburb', outer_suburb: 'Outer suburb', town: 'Town', rural: 'Village / Rural' },
  developmentFeeling: { fine_with_it: 'Fine with it', prefer_established: 'Prefer established', no_preference: 'No preference' },
} as const;

function label(map: keyof typeof LABEL_MAPS, val: string | null): string {
  if (!val) return 'Not set';
  return (LABEL_MAPS[map] as Record<string, string>)[val] ?? val;
}

function formatAreaTypes(areaTypes: string[]): string {
  if (areaTypes.length === 0) return 'No preference';
  return areaTypes.map((t) => (LABEL_MAPS.areaType as Record<string, string>)[t] ?? t).join(', ');
}

const AMENITY_LABELS: Record<string, string> = {
  supermarkets: 'Supermarkets',
  highStreet: 'High street',
  pubsBars: 'Pubs & bars',
  restaurantsCafes: 'Restaurants & cafes',
  parksGreenSpaces: 'Parks & green spaces',
  gymsLeisure: 'Gyms & leisure',
  healthcare: 'Healthcare',
  librariesCulture: 'Libraries & culture',
};

function ReviewItem({ label: lbl, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-sm text-muted-foreground">{lbl}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function SectionCard({
  title,
  stepPath,
  children,
}: {
  title: string;
  stepPath: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(stepPath)}
        >
          Edit
        </Button>
      </CardHeader>
      <CardContent className="divide-y">{children}</CardContent>
    </Card>
  );
}

export default function ReviewPage() {
  const { state } = useSurvey();
  const { data: session } = useSession();
  const router = useRouter();
  const { profile, commute, family, lifestyle, transport, environment } =
    state as SurveyState;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h2 className="mb-6 text-lg text-muted-foreground">
        Review your answers
      </h2>

      <div className="space-y-4">
        {/* Profile */}
        <SectionCard title="Profile" stepPath="/survey/profile">
          <ReviewItem label="Age range" value={label('ageRange', profile.ageRange)} />
          <ReviewItem label="Buy or rent" value={label('tenureType', profile.tenureType)} />
          <ReviewItem label="Budget" value={formatBudget(profile.budget, profile.tenureType)} />
          <ReviewItem label="Household" value={label('householdType', profile.householdType)} />
        </SectionCard>

        {/* Commute */}
        <SectionCard title="Commute" stepPath="/survey/commute">
          <ReviewItem
            label="Work location"
            value={commute.workLocation?.label ?? 'Not set'}
          />
          <ReviewItem
            label="Days in office"
            value={`${commute.daysPerWeek} days/week`}
          />
          <ReviewItem
            label="Max commute"
            value={`${commute.maxCommuteTime} mins${commute.daysPerWeek > 0 ? (commute.commuteTimeIsHardCap ? ' (strict)' : ' (preference)') : ''}`}
          />
          <ReviewItem
            label="Commute modes"
            value={
              commute.commuteModes.length > 0
                ? commute.commuteModes
                    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
                    .join(', ')
                : 'Not set'
            }
          />
        </SectionCard>

        {/* Family & Social */}
        <SectionCard title="Family & Social" stepPath="/survey/family">
          <ReviewItem
            label="Household size"
            value={`${family.householdSize}`}
          />
          <ReviewItem
            label="Children"
            value={label('childrenStatus', family.childrenStatus)}
          />
          {family.childrenStatus &&
            family.childrenStatus !== 'no' && (
              <ReviewItem
                label="School priority"
                value={label('schoolPriority', family.schoolPriority)}
              />
            )}
          <ReviewItem
            label="Family location"
            value={family.familyLocation?.label ?? 'Not set'}
          />
          <ReviewItem
            label="Family proximity"
            value={likert(family.familyProximityImportance)}
          />
          <ReviewItem
            label="Social scene"
            value={likert(family.socialImportance)}
          />
        </SectionCard>

        {/* Lifestyle */}
        <SectionCard title="Lifestyle & Amenities" stepPath="/survey/lifestyle">
          {Object.entries(AMENITY_LABELS).map(([key, lbl]) => (
            <ReviewItem
              key={key}
              label={lbl}
              value={likert(lifestyle[key as keyof typeof lifestyle])}
            />
          ))}
        </SectionCard>

        {/* Transport */}
        <SectionCard title="Transport & Connectivity" stepPath="/survey/transport">
          <ReviewItem
            label="Car ownership"
            value={label('carOwnership', transport.carOwnership)}
          />
          <ReviewItem
            label="Public transport"
            value={likert(transport.publicTransportReliance)}
          />
          <ReviewItem
            label="Train station"
            value={likert(transport.trainStationImportance)}
          />
          <ReviewItem
            label="Cycling"
            value={label('cycleFrequency', transport.cycleFrequency)}
          />
          <ReviewItem
            label="Broadband"
            value={likert(transport.broadbandImportance)}
          />
        </SectionCard>

        {/* Environment */}
        <SectionCard
          title="Environment & Surroundings"
          stepPath="/survey/environment"
        >
          <ReviewItem
            label="Area types"
            value={formatAreaTypes(environment.areaTypes)}
          />
          <ReviewItem
            label="Peace & quiet"
            value={likert(environment.peaceAndQuiet)}
          />
          <ReviewItem
            label="New development"
            value={label('developmentFeeling', environment.developmentFeeling)}
          />
          <div className="flex items-start justify-between gap-4 py-1">
            <span className="text-sm text-muted-foreground">Excluded areas</span>
            <div className="flex flex-wrap justify-end gap-1">
              {environment.excludeAreas.length > 0
                ? environment.excludeAreas.map((a) => (
                    <Badge key={a} variant="secondary">
                      {a}
                    </Badge>
                  ))
                : <span className="text-sm font-medium">None</span>}
            </div>
          </div>
          <div className="flex items-start justify-between gap-4 py-1">
            <span className="text-sm text-muted-foreground">Considering</span>
            <div className="flex flex-wrap justify-end gap-1">
              {environment.consideringAreas.length > 0
                ? environment.consideringAreas.map((a) => (
                    <Badge key={a} variant="outline">
                      {a}
                    </Badge>
                  ))
                : <span className="text-sm font-medium">None</span>}
            </div>
          </div>
        </SectionCard>
      </div>

      {!session && (
        <div className="mt-6 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => signIn('google')}
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </button>
            {' '}to save your survey and revisit results later.
          </p>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Button size="lg" onClick={() => router.push('/results')}>
          Get Results
        </Button>
      </div>
    </div>
  );
}
