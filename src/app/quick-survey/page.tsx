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
import {
  buildQuickSurveyState,
  QUICK_PRIORITY_KEYS,
  QUICK_PRIORITY_LABELS,
  type QuickPriorityKey,
} from '@/lib/survey/quickDefaults';
import type { CommuteMode, AreaType, GeoLocation } from '@/lib/survey/types';

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
  const { reset, loadState } = useSurvey();

  // Always start fresh
  useEffect(() => {
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Q1 — Location
  const [workLocation, setWorkLocation] = useState<GeoLocation | null>(null);
  const [isRemote, setIsRemote] = useState(false);

  // Q2 — Commute
  const [commuteModes, setCommuteModes] = useState<CommuteMode[]>([]);
  const [maxCommuteTime, setMaxCommuteTime] = useState(45);

  // Q3 — Area type
  const [areaTypes, setAreaTypes] = useState<AreaType[]>([]);

  // Q4 — Priorities
  const [topPriorities, setTopPriorities] = useState<QuickPriorityKey[]>([]);

  function togglePriority(key: QuickPriorityKey) {
    setTopPriorities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const [noPreference, setNoPreference] = useState(true);

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
    const state = buildQuickSurveyState({
      workLocation,
      isRemote,
      commuteModes,
      maxCommuteTime,
      areaTypes,
      topPriorities,
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
                We&apos;ll use the wider UK as your search area.
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
                <span className="font-bold text-primary">{maxCommuteTime} mins</span>
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
          Find My Neighbourhoods
        </Button>
        <p className="text-xs text-muted-foreground">
          All questions are optional — we&apos;ll use sensible defaults for anything left blank.
        </p>
      </div>
    </div>
  );
}
