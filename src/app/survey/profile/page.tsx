'use client';

import { useEffect } from 'react';
import { useSurvey } from '@/hooks/useSurvey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BudgetSlider } from '@/components/survey/BudgetSlider';
import { StepNavigation } from '@/components/survey/StepNavigation';
import type { AgeRange, TenureType, HouseholdType } from '@/lib/survey/types';

const AGE_RANGES: { value: AgeRange; label: string }[] = [
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-54', label: '45-54' },
  { value: '55-64', label: '55-64' },
  { value: '65+', label: '65+' },
];

const TENURE_OPTIONS: { value: TenureType; label: string }[] = [
  { value: 'buy', label: 'Buy' },
  { value: 'rent', label: 'Rent' },
  { value: 'not_sure', label: 'Not sure yet' },
];

const HOUSEHOLD_OPTIONS: { value: HouseholdType; label: string }[] = [
  { value: 'alone', label: 'Alone' },
  { value: 'with_partner', label: 'With partner' },
  { value: 'with_family', label: 'With family' },
  { value: 'house_share', label: 'House share' },
];

export default function ProfilePage() {
  const { state, updateProfile, setStep } = useSurvey();
  const { profile } = state;

  useEffect(() => {
    setStep(1);
  }, [setStep]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Age Range */}
          <div className="space-y-2">
            <Label>Age range</Label>
            <Select
              value={profile.ageRange ?? ''}
              onValueChange={(val) =>
                updateProfile({ ageRange: val as AgeRange })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your age range" />
              </SelectTrigger>
              <SelectContent>
                {AGE_RANGES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Buy or Rent */}
          <div className="space-y-2">
            <Label>Buy or rent?</Label>
            <RadioGroup
              value={profile.tenureType ?? ''}
              onValueChange={(val) =>
                updateProfile({ tenureType: val as TenureType })
              }
            >
              {TENURE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`tenure-${opt.value}`} />
                  <Label htmlFor={`tenure-${opt.value}`}>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Budget */}
          <BudgetSlider
            value={profile.budget}
            onChange={(val) => updateProfile({ budget: val })}
            tenureType={profile.tenureType}
          />

          {/* Household Type */}
          <div className="space-y-2">
            <Label>Moving alone or with others?</Label>
            <RadioGroup
              value={profile.householdType ?? ''}
              onValueChange={(val) =>
                updateProfile({ householdType: val as HouseholdType })
              }
            >
              {HOUSEHOLD_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={opt.value}
                    id={`household-${opt.value}`}
                  />
                  <Label htmlFor={`household-${opt.value}`}>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <StepNavigation currentStep={1} />
    </div>
  );
}
