'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSurvey } from '@/hooks/useSurvey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { LocationAutocomplete } from '@/components/survey/LocationAutocomplete';
import { formatMinutes } from '@/lib/format-duration';
import {
  buildQuickSurveyState,
  QUICK_PRIORITY_KEYS,
  QUICK_PRIORITY_LABELS,
  type QuickPriorityKey,
} from '@/lib/survey/quickDefaults';
import type { CommuteMode, AreaType, GeoLocation } from '@/lib/survey/types';

/**
 * For each region we store anchors at different "urbanness" levels.
 * When the user selects a region, we pick the anchor whose urbanness best
 * matches their preferred area type, so the search grid is centred on a
 * real populated place rather than a geographic midpoint.
 *
 * urban   → city_centre / inner_suburb  (big city)
 * suburban → outer_suburb               (large town on city fringe)
 * rural   → town / rural / no preference (market town / open countryside)
 */
type RegionAnchorSet = {
  urban:    GeoLocation;
  suburban: GeoLocation;
  rural:    GeoLocation;
};

const REMOTE_REGIONS: {
  value: string;
  label: string;
  anchors: RegionAnchorSet | null;  // null = "Anywhere" fallback
}[] = [
  {
    value: 'north', label: 'North England',
    anchors: {
      urban:    { label: 'Manchester',  lat: 53.4808, lng: -2.2426 },
      suburban: { label: 'Leeds',       lat: 53.8008, lng: -1.5491 },
      rural:    { label: 'Harrogate',   lat: 53.9921, lng: -1.5416 },
    },
  },
  {
    value: 'midlands', label: 'Midlands',
    anchors: {
      urban:    { label: 'Birmingham',  lat: 52.4862, lng: -1.8904 },
      suburban: { label: 'Coventry',    lat: 52.4068, lng: -1.5197 },
      rural:    { label: 'Shrewsbury',  lat: 52.7071, lng: -2.7540 },
    },
  },
  {
    value: 'east', label: 'East England',
    anchors: {
      urban:    { label: 'Cambridge',   lat: 52.2053, lng:  0.1218 },
      suburban: { label: 'Norwich',     lat: 52.6309, lng:  1.2974 },
      rural:    { label: 'Ely',         lat: 52.3985, lng:  0.2621 },
    },
  },
  {
    value: 'london', label: 'London & SE',
    anchors: {
      urban:    { label: 'London',      lat: 51.5074, lng: -0.1278 },
      suburban: { label: 'Guildford',   lat: 51.2362, lng: -0.5704 },
      rural:    { label: 'Horsham',     lat: 51.0632, lng: -0.3266 },
    },
  },
  {
    value: 'south', label: 'South England',
    anchors: {
      urban:    { label: 'Southampton', lat: 50.9097, lng: -1.4044 },
      suburban: { label: 'Winchester',  lat: 51.0632, lng: -1.3080 },
      rural:    { label: 'Salisbury',   lat: 51.0693, lng: -1.7944 },
    },
  },
  {
    value: 'west', label: 'South West',
    anchors: {
      urban:    { label: 'Bristol',     lat: 51.4545, lng: -2.5879 },
      suburban: { label: 'Bath',        lat: 51.3781, lng: -2.3597 },
      rural:    { label: 'Taunton',     lat: 51.0153, lng: -3.1017 },
    },
  },
  {
    value: 'wales', label: 'Wales',
    anchors: {
      urban:    { label: 'Cardiff',     lat: 51.4816, lng: -3.1791 },
      suburban: { label: 'Swansea',     lat: 51.6214, lng: -3.9436 },
      rural:    { label: 'Brecon',      lat: 51.9467, lng: -3.3872 },
    },
  },
  {
    value: 'scotland', label: 'Scotland',
    anchors: {
      urban:    { label: 'Glasgow',     lat: 55.8642, lng: -4.2518 },
      suburban: { label: 'Edinburgh',   lat: 55.9533, lng: -3.1883 },
      rural:    { label: 'Perth',       lat: 56.3950, lng: -3.4310 },
    },
  },
  {
    value: 'ni', label: 'Northern Ireland',
    anchors: {
      urban:    { label: 'Belfast',     lat: 54.5973, lng: -5.9301 },
      suburban: { label: 'Lisburn',     lat: 54.5162, lng: -6.0580 },
      rural:    { label: 'Ballymena',   lat: 54.8636, lng: -6.2762 },
    },
  },
  {
    value: 'anywhere', label: 'Anywhere in the UK',
    anchors: null,
  },
];

/**
 * Pick the best anchor for a region given the user's preferred area types.
 * Falls back gracefully: no anchors → null (results page uses UK default).
 */
function resolveRegionAnchor(
  regionValue: string,
  areaTypes: AreaType[],
): GeoLocation | null {
  const region = REMOTE_REGIONS.find((r) => r.value === regionValue);
  if (!region || !region.anchors) return null;

  const { anchors } = region;

  // Determine the most urban preference selected
  const hasUrban    = areaTypes.some((t) => t === 'city_centre' || t === 'inner_suburb');
  const hasSuburban = areaTypes.some((t) => t === 'outer_suburb');
  const hasRural    = areaTypes.some((t) => t === 'town' || t === 'rural');

  // If the user picked no area type (no preference), default to urban anchor
  // so the grid starts somewhere meaningful rather than a geographic midpoint
  if (hasUrban || (!hasSuburban && !hasRural)) return anchors.urban;
  if (hasSuburban) return anchors.suburban;
  return anchors.rural;
}

const COMMUTE_MODES: { value: CommuteMode; label: string }[] = [
  { value: 'drive', label: 'Drive' },
  { value: 'train', label: 'Train' },
  { value: 'bus', label: 'Bus' },
  { value: 'cycle', label: 'Cycle' },
  { value: 'walk', label: 'Walk' },
];

const AREA_TYPE_OPTIONS: { value: AreaType; label: string; description: string }[] = [
  { value: 'city_centre', label: 'City centre', description: 'Busy, walkable, everything on your doorstep' },
  { value: 'inner_suburb', label: 'Inner suburb', description: 'Close to the city but a bit quieter' },
  { value: 'outer_suburb', label: 'Outer suburb', description: 'Residential feel, good transport links' },
  { value: 'town', label: 'Town', description: 'Self-contained community, away from the city' },
  { value: 'rural', label: 'Village / Rural', description: 'Peace, space, and countryside' },
];

export default function QuickSurveyPage() {
  const router = useRouter();
  const { state, reset, loadState } = useSurvey();
  const isReturningQuickSurvey = state.surveyMode === 'quick';

  // If returning from results with existing quick survey state, preserve it.
  // Otherwise, start fresh.
  useEffect(() => {
    if (!isReturningQuickSurvey) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Q1 — Location
  const [workLocation, setWorkLocation] = useState<GeoLocation | null>(
    isReturningQuickSurvey ? state.commute.workLocation : null
  );
  const [isRemote, setIsRemote] = useState<boolean>(
    isReturningQuickSurvey ? state.commute.daysPerWeek === 0 : false
  );
  const [remoteRegion, setRemoteRegion] = useState<string>(
    isReturningQuickSurvey ? (state.commute.remoteRegion ?? 'anywhere') : 'anywhere'
  );

  // Q2 — Commute
  const [commuteModes, setCommuteModes] = useState<CommuteMode[]>(
    isReturningQuickSurvey ? state.commute.commuteModes : []
  );
  const [maxCommuteTime, setMaxCommuteTime] = useState<number>(
    isReturningQuickSurvey ? state.commute.maxCommuteTime : 45
  );

  // Q3 — Area type
  const [areaTypes, setAreaTypes] = useState<AreaType[]>(
    isReturningQuickSurvey ? state.environment.areaTypes : []
  );

  // Q4 — Priorities
  const [topPriorities, setTopPriorities] = useState<QuickPriorityKey[]>(() => {
    if (!isReturningQuickSurvey) return [];
    // Convert likert 5 values back to priorities
    const priorities: QuickPriorityKey[] = [];
    const likert5 = 5 as const;
    if (state.lifestyle.supermarkets === likert5) priorities.push('supermarkets');
    if (state.lifestyle.highStreet === likert5) priorities.push('highStreet');
    if (state.lifestyle.pubsBars === likert5) priorities.push('pubsBars');
    if (state.lifestyle.restaurantsCafes === likert5) priorities.push('restaurantsCafes');
    if (state.lifestyle.parksGreenSpaces === likert5) priorities.push('parksGreenSpaces');
    if (state.lifestyle.gymsLeisure === likert5) priorities.push('gymsLeisure');
    if (state.lifestyle.healthcare === likert5) priorities.push('healthcare');
    if (state.lifestyle.librariesCulture === likert5) priorities.push('librariesCulture');
    if (state.transport.publicTransportReliance === likert5) priorities.push('publicTransportReliance');
    if (state.transport.trainStationImportance === likert5) priorities.push('trainStationImportance');
    if (state.family.socialImportance === likert5) priorities.push('socialImportance');
    return priorities;
  });

  function togglePriority(key: QuickPriorityKey) {
    setTopPriorities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const [noPreference, setNoPreference] = useState(false);

  function toggleAreaType(value: AreaType) {
    setNoPreference(false);
    setAreaTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  function toggleNoPreference(checked: boolean) {
    setNoPreference(checked);
    if (checked) {
      setAreaTypes([]);
    }
  }

  function handleSubmit() {
    const resolvedLocation = isRemote
      ? resolveRegionAnchor(remoteRegion, areaTypes)
      : workLocation;

    const state = buildQuickSurveyState({
      workLocation: resolvedLocation,
      isRemote,
      commuteModes,
      maxCommuteTime,
      areaTypes,
      topPriorities,
      remoteRegion: isRemote ? remoteRegion : null,
    });
    loadState(state);
    router.push('/results');
  }

  const showCommuteDetails = !isRemote;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Quick Start</h1>
        <p className="mt-2 text-muted-foreground">
          Answer a few questions and we&apos;ll find your ideal neighbourhood in minutes.
        </p>
      </div>

      {/* Q1 — Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              1
            </span>
            Where are you looking to live near?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isRemote && (
            <LocationAutocomplete
              value={workLocation}
              onChange={setWorkLocation}
              label="Work or anchor location"
              placeholder="Search for a city, town, or postcode…"
            />
          )}

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="remote-switch" className="cursor-pointer text-sm font-medium">
                I work fully remotely
              </Label>
              <p className="text-xs text-muted-foreground">
                We&apos;ll ask where in the UK you&apos;d like to live instead.
              </p>
            </div>
            <Switch
              id="remote-switch"
              checked={isRemote}
              onCheckedChange={(checked) => {
                setIsRemote(checked);
                if (checked) setWorkLocation(null);
              }}
            />
          </div>

          {isRemote && (
            <div className="space-y-2">
              <Label>Where in the UK would you like to live?</Label>
              <div className="flex flex-wrap gap-2">
                {REMOTE_REGIONS.map((region) => (
                  <button
                    key={region.value}
                    type="button"
                    onClick={() => setRemoteRegion(region.value)}
                    className={[
                      'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                      remoteRegion === region.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-accent',
                    ].join(' ')}
                  >
                    {region.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Q2 — Commute (hidden when fully remote) */}
      {showCommuteDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                2
              </span>
              How would you commute?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Select all that apply</Label>
              <ToggleGroup
                type="multiple"
                variant="outline"
                value={commuteModes}
                onValueChange={(val) => setCommuteModes(val as CommuteMode[])}
                className="flex-wrap"
              >
                {COMMUTE_MODES.map((mode) => (
                  <ToggleGroupItem key={mode.value} value={mode.value} className="px-4">
                    {mode.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="space-y-3">
              <Label>
                Max commute time:{' '}
                <span className="font-bold text-primary">{formatMinutes(maxCommuteTime)}</span>
              </Label>
              <Slider
                value={[maxCommuteTime]}
                onValueChange={([val]) => setMaxCommuteTime(val)}
                min={15}
                max={90}
                step={5}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>15 mins</span>
                <span>90 mins</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Q3 — Area type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {showCommuteDetails ? '3' : '2'}
            </span>
            What type of area do you prefer?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {AREA_TYPE_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                className={[
                  'flex items-start space-x-3 rounded-lg border border-border px-4 py-3',
                  areaTypes.includes(opt.value) ? 'border-primary bg-primary/5' : '',
                ].join(' ')}
              >
                <Checkbox
                  id={`area-${opt.value}`}
                  checked={areaTypes.includes(opt.value)}
                  onCheckedChange={() => toggleAreaType(opt.value)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={`area-${opt.value}`}
                  className="cursor-pointer space-y-0.5"
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.description}</span>
                </Label>
              </div>
            ))}
            <div className="flex items-center space-x-3 rounded-lg border border-border px-4 py-3 mt-2">
              <Checkbox
                id="area-no-preference"
                checked={noPreference}
                onCheckedChange={(checked) => toggleNoPreference(checked as boolean)}
              />
              <Label htmlFor="area-no-preference" className="cursor-pointer">
                No preference
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Q4 — Priorities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {showCommuteDetails ? '4' : '3'}
            </span>
            What matters most to you?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pick the things that genuinely matter. The more selective you are, the more
            tailored your results.
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PRIORITY_KEYS.map((key) => {
              const selected = topPriorities.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePriority(key)}
                  className={[
                    'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-accent',
                  ].join(' ')}
                >
                  {QUICK_PRIORITY_LABELS[key]}
                </button>
              );
            })}
          </div>
          {topPriorities.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {topPriorities.length} selected
            </p>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex flex-col items-center gap-2 pb-8">
        <Button size="lg" className="w-full sm:w-auto sm:px-12" onClick={handleSubmit}>
          Find where to live
        </Button>
        <p className="text-xs text-muted-foreground">
          All questions are optional — we&apos;ll use sensible defaults for anything left blank.
        </p>
      </div>
    </div>
  );
}
