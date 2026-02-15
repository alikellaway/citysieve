"use client";

import { useRouter } from "next/navigation";
import { SURVEY_STEPS, TOTAL_STEPS } from "@/lib/survey/steps";
import { Button } from "@/components/ui/button";

interface StepNavigationProps {
  currentStep: number;
  onNext?: () => boolean | void;
}

export function StepNavigation({ currentStep, onNext }: StepNavigationProps) {
  const router = useRouter();

  const isFirst = currentStep === 1;
  const isLast = currentStep === TOTAL_STEPS;

  function handleBack() {
    const prevStep = SURVEY_STEPS[currentStep - 2];
    if (prevStep) router.push(prevStep.path);
  }

  function handleNext() {
    if (onNext) {
      const result = onNext();
      if (result === false) return;
    }

    if (isLast) {
      router.push("/survey/review");
    } else {
      const nextStep = SURVEY_STEPS[currentStep];
      if (nextStep) router.push(nextStep.path);
    }
  }

  return (
    <div className="flex items-center justify-between pt-8">
      <Button
        type="button"
        variant="outline"
        onClick={handleBack}
        disabled={isFirst}
      >
        Back
      </Button>
      <Button type="button" onClick={handleNext}>
        {isLast ? "Review Answers" : "Next"}
      </Button>
    </div>
  );
}
