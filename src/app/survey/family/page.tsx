'use client';

import { useEffect } from 'react';
import { useSurvey } from '@/hooks/useSurvey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LocationAutocomplete } from '@/components/survey/LocationAutocomplete';
import { LikertScale } from '@/components/survey/LikertScale';
import { StepNavigation } from '@/components/survey/StepNavigation';
import type {
  ChildrenStatus,
  SchoolPriority,
  LikertValue,
} from '@/lib/survey/types';

const CHILDREN_OPTIONS: { value: ChildrenStatus; label: string }[] = [
  { value: 'no', label: 'No children' },
  { value: 'under_5', label: 'Under 5' },
  { value: 'school_age', label: 'School age' },
  { value: 'both', label: 'Both' },
];

const SCHOOL_OPTIONS: { value: SchoolPriority; label: string }[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'both', label: 'Both' },
  { value: 'not_important', label: 'Not important' },
];

export default function FamilyPage() {
  const { state, updateFamily, setStep } = useSurvey();
  const { family } = state;

  useEffect(() => {
    setStep(3);
  }, [setStep]);

  const hasChildren = family.childrenStatus !== null && family.childrenStatus !== 'no';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Family & Social</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Household Size */}
          <div className="space-y-2">
            <Label>Household size</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  updateFamily({
                    householdSize: Math.max(1, family.householdSize - 1),
                  })
                }
                disabled={family.householdSize <= 1}
              >
                -
              </Button>
              <span className="w-8 text-center text-lg font-semibold">
                {family.householdSize}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  updateFamily({
                    householdSize: Math.min(8, family.householdSize + 1),
                  })
                }
                disabled={family.householdSize >= 8}
              >
                +
              </Button>
            </div>
          </div>

          {/* Children Status */}
          <div className="space-y-2">
            <Label>Do you have children?</Label>
            <RadioGroup
              value={family.childrenStatus ?? ''}
              onValueChange={(val) =>
                updateFamily({
                  childrenStatus: val as ChildrenStatus,
                  schoolPriority:
                    val === 'no' ? null : family.schoolPriority,
                })
              }
            >
              {CHILDREN_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={opt.value}
                    id={`children-${opt.value}`}
                  />
                  <Label htmlFor={`children-${opt.value}`}>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* School Priority (conditional) */}
          {hasChildren && (
            <div className="space-y-2">
              <Label>School priority</Label>
              <RadioGroup
                value={family.schoolPriority ?? ''}
                onValueChange={(val) =>
                  updateFamily({ schoolPriority: val as SchoolPriority })
                }
              >
                {SCHOOL_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={opt.value}
                      id={`school-${opt.value}`}
                    />
                    <Label htmlFor={`school-${opt.value}`}>{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Family Location */}
          <LocationAutocomplete
            value={family.familyLocation}
            onChange={(loc) => updateFamily({ familyLocation: loc })}
            label="Where does your family live?"
            placeholder="Search for a location..."
          />

          {/* Family Proximity Importance */}
          <LikertScale
            label="How important is living near family?"
            value={family.familyProximityImportance}
            onChange={(val: LikertValue) =>
              updateFamily({ familyProximityImportance: val })
            }
          />

          {/* Social Importance */}
          <LikertScale
            label="How important is a social scene nearby?"
            value={family.socialImportance}
            onChange={(val: LikertValue) =>
              updateFamily({ socialImportance: val })
            }
          />
        </CardContent>
      </Card>

      <StepNavigation currentStep={3} />
    </div>
  );
}
