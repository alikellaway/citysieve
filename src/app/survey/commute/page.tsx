'use client';

import { useEffect } from 'react';
import { useSurvey } from '@/hooks/useSurvey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { formatMinutes } from '@/lib/format-duration';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LocationAutocomplete } from '@/components/survey/LocationAutocomplete';
import { StepNavigation } from '@/components/survey/StepNavigation';
import type { CommuteMode } from '@/lib/survey/types';

const COMMUTE_MODES: { value: CommuteMode; label: string }[] = [
  { value: 'drive', label: 'Drive' },
  { value: 'train', label: 'Train' },
  { value: 'bus', label: 'Bus' },
  { value: 'cycle', label: 'Cycle' },
  { value: 'walk', label: 'Walk' },
];

export default function CommutePage() {
  const { state, updateCommute, setStep } = useSurvey();
  const { commute } = state;

  useEffect(() => {
    setStep(2);
  }, [setStep]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Commute</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Work Location */}
          <LocationAutocomplete
            value={commute.workLocation}
            onChange={(loc) => updateCommute({ workLocation: loc })}
            label={commute.daysPerWeek === 0 ? 'Where would you roughly like to live?' : 'Where do you work?'}
            placeholder={commute.daysPerWeek === 0 ? 'Search for a city, region, or postcode…' : 'Search for your workplace...'}
          />

          {/* Days Per Week */}
          <div className="space-y-3">
            <Label>
              Days per week in the office:{' '}
              <span className="font-bold text-primary">{commute.daysPerWeek}</span>
            </Label>
            <Slider
              value={[commute.daysPerWeek]}
              onValueChange={([val]) => updateCommute({ daysPerWeek: val })}
              min={0}
              max={5}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Fully remote</span>
              <span>5 days</span>
            </div>
          </div>

          {/* Max Commute Time */}
          <div className="space-y-3">
            <Label>
              Max commute time:{' '}
              <span className="font-bold text-primary">{formatMinutes(commute.maxCommuteTime)}</span>
            </Label>
            <Slider
              value={[commute.maxCommuteTime]}
              onValueChange={([val]) => updateCommute({ maxCommuteTime: val })}
              min={15}
              max={90}
              step={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>15 mins</span>
              <span>90 mins</span>
            </div>
          </div>

          {/* Hard cap toggle — only relevant when actually commuting */}
          {commute.daysPerWeek > 0 && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
              <div className="space-y-0.5">
                <Label
                  htmlFor="hard-cap-switch"
                  className="cursor-pointer text-sm font-medium"
                >
                  Strict maximum
                </Label>
                <p className="text-xs text-muted-foreground">
                  {commute.commuteTimeIsHardCap
                    ? 'Areas beyond this commute time will be excluded from results.'
                    : 'Areas beyond this time will score lower, but still appear in results.'}
                </p>
              </div>
              <Switch
                id="hard-cap-switch"
                checked={commute.commuteTimeIsHardCap}
                onCheckedChange={(checked) =>
                  updateCommute({ commuteTimeIsHardCap: checked })
                }
              />
            </div>
          )}

          {/* Commute Modes */}
          <div className="space-y-3">
            <Label>How would you commute? (select all that apply)</Label>
            <ToggleGroup
              type="multiple"
              variant="outline"
              value={commute.commuteModes}
              onValueChange={(val) =>
                updateCommute({ commuteModes: val as CommuteMode[] })
              }
              className="flex-wrap"
            >
              {COMMUTE_MODES.map((mode) => (
                <ToggleGroupItem
                  key={mode.value}
                  value={mode.value}
                  className="px-4"
                >
                  {mode.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      <StepNavigation currentStep={2} />
    </div>
  );
}
