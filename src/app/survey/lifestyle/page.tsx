'use client';

import { useEffect } from 'react';
import { useSurvey } from '@/hooks/useSurvey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AmenityRatingGrid } from '@/components/survey/AmenityRatingGrid';
import { StepNavigation } from '@/components/survey/StepNavigation';
import type { LikertValue, LifestyleStep } from '@/lib/survey/types';

export default function LifestylePage() {
  const { state, updateLifestyle, setStep } = useSurvey();
  const { lifestyle } = state;

  useEffect(() => {
    setStep(4);
  }, [setStep]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lifestyle & Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <AmenityRatingGrid
            values={lifestyle}
            onChange={(key: keyof LifestyleStep, value: LikertValue) =>
              updateLifestyle({ [key]: value })
            }
          />
        </CardContent>
      </Card>

      <StepNavigation currentStep={4} />
    </div>
  );
}
