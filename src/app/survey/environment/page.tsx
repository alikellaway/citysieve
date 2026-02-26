'use client';

import { useEffect, useState } from 'react';
import { useSurvey } from '@/hooks/useSurvey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { LikertScale } from '@/components/survey/LikertScale';
import { TagInput } from '@/components/survey/TagInput';
import { StepNavigation } from '@/components/survey/StepNavigation';
import type {
  AreaType,
  LikertValue,
} from '@/lib/survey/types';

const AREA_TYPE_OPTIONS: { value: AreaType; label: string }[] = [
  { value: 'city_centre', label: 'City centre' },
  { value: 'inner_suburb', label: 'Inner suburb' },
  { value: 'outer_suburb', label: 'Outer suburb' },
  { value: 'town', label: 'Town' },
  { value: 'rural', label: 'Village / Rural' },
];


export default function EnvironmentPage() {
  const { state, updateEnvironment, setStep } = useSurvey();
  const { environment } = state;

  useEffect(() => {
    setStep(6);
  }, [setStep]);

  const [noPreference, setNoPreference] = useState(environment.areaTypes.length === 0);

  function toggleAreaType(value: AreaType) {
    setNoPreference(false);
    const current = environment.areaTypes;
    const updated = current.includes(value)
      ? current.filter((t) => t !== value)
      : [...current, value];
    updateEnvironment({ areaTypes: updated });
  }

  function toggleNoPreference(checked: boolean) {
    setNoPreference(checked);
    if (checked) {
      updateEnvironment({ areaTypes: [] });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Environment & Surroundings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Area Type */}
          <div className="space-y-3">
            <Label>What type of area do you prefer?</Label>
            <p className="text-sm text-muted-foreground">
              Select all that apply, or &quot;No preference&quot; to see all areas.
            </p>
            <div className="space-y-2">
              {AREA_TYPE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`area-${opt.value}`}
                    checked={environment.areaTypes.includes(opt.value)}
                    onCheckedChange={() => toggleAreaType(opt.value)}
                  />
                  <Label
                    htmlFor={`area-${opt.value}`}
                    className="cursor-pointer"
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
              <div className="flex items-center space-x-2 pt-2 border-t">
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
          </div>

          {/* Peace and Quiet */}
          <LikertScale
            label="How important is peace and quiet?"
            value={environment.peaceAndQuiet}
            onChange={(val: LikertValue) =>
              updateEnvironment({ peaceAndQuiet: val })
            }
          />


          {/* Exclude Areas */}
          <TagInput
            value={environment.excludeAreas}
            onChange={(tags) => updateEnvironment({ excludeAreas: tags })}
            label="Any areas to exclude?"
            placeholder="Type an area name and press Enter..."
            enableAutocomplete
            helperText="We'll filter these out from your results"
          />

          {/* Considering Areas */}
          <TagInput
            value={environment.consideringAreas}
            onChange={(tags) => updateEnvironment({ consideringAreas: tags })}
            label="Areas you're already considering?"
            placeholder="Type an area name and press Enter..."
            enableAutocomplete
            helperText="We'll prioritise these in your results"
          />
        </CardContent>
      </Card>

      <StepNavigation currentStep={6} />
    </div>
  );
}
