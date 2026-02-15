'use client';

import { useEffect } from 'react';
import { useSurvey } from '@/hooks/useSurvey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LikertScale } from '@/components/survey/LikertScale';
import { TagInput } from '@/components/survey/TagInput';
import { StepNavigation } from '@/components/survey/StepNavigation';
import type {
  AreaType,
  DevelopmentFeeling,
  LikertValue,
} from '@/lib/survey/types';

const AREA_TYPE_OPTIONS: { value: AreaType; label: string }[] = [
  { value: 'city_centre', label: 'City centre' },
  { value: 'inner_suburb', label: 'Inner suburb' },
  { value: 'outer_suburb', label: 'Outer suburb' },
  { value: 'town', label: 'Town' },
  { value: 'rural', label: 'Village / Rural' },
];

const DEVELOPMENT_OPTIONS: { value: DevelopmentFeeling; label: string }[] = [
  { value: 'fine_with_it', label: 'Fine with it' },
  { value: 'prefer_established', label: 'Prefer established areas' },
  { value: 'no_preference', label: 'No preference' },
];

export default function EnvironmentPage() {
  const { state, updateEnvironment, setStep } = useSurvey();
  const { environment } = state;

  useEffect(() => {
    setStep(6);
  }, [setStep]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Environment & Surroundings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Area Type */}
          <div className="space-y-2">
            <Label>What type of area do you prefer?</Label>
            <RadioGroup
              value={environment.areaType ?? ''}
              onValueChange={(val) =>
                updateEnvironment({ areaType: val as AreaType })
              }
            >
              {AREA_TYPE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={opt.value}
                    id={`area-${opt.value}`}
                  />
                  <Label htmlFor={`area-${opt.value}`}>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Peace and Quiet */}
          <LikertScale
            label="How important is peace and quiet?"
            value={environment.peaceAndQuiet}
            onChange={(val: LikertValue) =>
              updateEnvironment({ peaceAndQuiet: val })
            }
          />

          {/* Green Spaces */}
          <LikertScale
            label="How important are green spaces nearby?"
            value={environment.greenSpaces}
            onChange={(val: LikertValue) =>
              updateEnvironment({ greenSpaces: val })
            }
          />

          {/* Development Feeling */}
          <div className="space-y-2">
            <Label>How do you feel about new development?</Label>
            <RadioGroup
              value={environment.developmentFeeling ?? ''}
              onValueChange={(val) =>
                updateEnvironment({
                  developmentFeeling: val as DevelopmentFeeling,
                })
              }
            >
              {DEVELOPMENT_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={opt.value}
                    id={`dev-${opt.value}`}
                  />
                  <Label htmlFor={`dev-${opt.value}`}>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Exclude Areas */}
          <TagInput
            value={environment.excludeAreas}
            onChange={(tags) => updateEnvironment({ excludeAreas: tags })}
            label="Any areas to exclude?"
            placeholder="Type an area name and press Enter..."
          />

          {/* Considering Areas */}
          <TagInput
            value={environment.consideringAreas}
            onChange={(tags) => updateEnvironment({ consideringAreas: tags })}
            label="Areas you're already considering?"
            placeholder="Type an area name and press Enter..."
          />
        </CardContent>
      </Card>

      <StepNavigation currentStep={6} />
    </div>
  );
}
