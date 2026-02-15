'use client';

import { useEffect } from 'react';
import { useSurvey } from '@/hooks/useSurvey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LikertScale } from '@/components/survey/LikertScale';
import { StepNavigation } from '@/components/survey/StepNavigation';
import type {
  CarOwnership,
  CycleFrequency,
  LikertValue,
} from '@/lib/survey/types';

const CAR_OPTIONS: { value: CarOwnership; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'considering', label: 'Considering' },
];

const CYCLE_OPTIONS: { value: CycleFrequency; label: string }[] = [
  { value: 'yes', label: 'Yes, regularly' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'no', label: 'No' },
];

export default function TransportPage() {
  const { state, updateTransport, setStep } = useSurvey();
  const { transport } = state;

  useEffect(() => {
    setStep(5);
  }, [setStep]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transport & Connectivity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Car Ownership */}
          <div className="space-y-2">
            <Label>Do you own a car?</Label>
            <RadioGroup
              value={transport.carOwnership ?? ''}
              onValueChange={(val) =>
                updateTransport({ carOwnership: val as CarOwnership })
              }
            >
              {CAR_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`car-${opt.value}`} />
                  <Label htmlFor={`car-${opt.value}`}>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Public Transport Reliance */}
          <LikertScale
            label="How much do you rely on public transport?"
            value={transport.publicTransportReliance}
            onChange={(val: LikertValue) =>
              updateTransport({ publicTransportReliance: val })
            }
            lowLabel="Not at all"
            highLabel="Entirely"
          />

          {/* Train Station Importance */}
          <LikertScale
            label="How important is a nearby train station?"
            value={transport.trainStationImportance}
            onChange={(val: LikertValue) =>
              updateTransport({ trainStationImportance: val })
            }
          />

          {/* Cycle Frequency */}
          <div className="space-y-2">
            <Label>Do you cycle?</Label>
            <RadioGroup
              value={transport.cycleFrequency ?? ''}
              onValueChange={(val) =>
                updateTransport({ cycleFrequency: val as CycleFrequency })
              }
            >
              {CYCLE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={opt.value}
                    id={`cycle-${opt.value}`}
                  />
                  <Label htmlFor={`cycle-${opt.value}`}>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Broadband Importance */}
          <LikertScale
            label="How important is fast broadband?"
            value={transport.broadbandImportance}
            onChange={(val: LikertValue) =>
              updateTransport({ broadbandImportance: val })
            }
          />
        </CardContent>
      </Card>

      <StepNavigation currentStep={5} />
    </div>
  );
}
