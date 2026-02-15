"use client";

import type { LikertValue } from "@/lib/survey/types";
import { cn } from "@/lib/utils";

interface LikertScaleProps {
  value: LikertValue;
  onChange: (value: LikertValue) => void;
  label: string;
  lowLabel?: string;
  highLabel?: string;
}

const LIKERT_OPTIONS: LikertValue[] = [1, 2, 3, 4, 5];

export function LikertScale({
  value,
  onChange,
  label,
  lowLabel = "Not important",
  highLabel = "Very important",
}: LikertScaleProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-1">
        <span className="hidden text-xs text-muted-foreground sm:block sm:w-24 sm:text-right">
          {lowLabel}
        </span>
        <div className="flex flex-1 justify-center gap-1 sm:gap-2">
          {LIKERT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors sm:h-11 sm:w-11",
                value === opt
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        <span className="hidden text-xs text-muted-foreground sm:block sm:w-24">
          {highLabel}
        </span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground sm:hidden">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
