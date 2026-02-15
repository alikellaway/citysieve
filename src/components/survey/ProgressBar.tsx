"use client";

import { SURVEY_STEPS } from "@/lib/survey/steps";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ProgressBarProps {
  currentStep: number;
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <nav className="w-full py-4">
      <ol className="flex items-center gap-1 sm:gap-2">
        {SURVEY_STEPS.map((step) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;

          return (
            <li key={step.id} className="flex-1">
              <Link
                href={step.path}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg p-2 text-center transition-colors",
                  isActive && "bg-primary/10",
                  isCompleted && "hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isActive &&
                      "bg-primary text-primary-foreground",
                    isCompleted &&
                      "bg-primary/20 text-primary",
                    !isActive &&
                      !isCompleted &&
                      "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? "✓" : step.number}
                </span>
                <span
                  className={cn(
                    "hidden text-xs sm:block",
                    isActive && "font-semibold text-primary",
                    isCompleted && "text-primary",
                    !isActive &&
                      !isCompleted &&
                      "text-muted-foreground"
                  )}
                >
                  {step.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-primary transition-all duration-300"
          style={{
            width: `${((currentStep - 1) / SURVEY_STEPS.length) * 100}%`,
          }}
        />
      </div>
    </nav>
  );
}
