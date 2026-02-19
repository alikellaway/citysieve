"use client";

import { useState } from "react";
import type { TenureType } from "@/lib/survey/types";
import { Input } from "@/components/ui/input";

interface BudgetSliderProps {
  value: number | null;
  onChange: (value: number) => void;
  tenureType: TenureType | null;
}

function getBudgetConfig(tenureType: TenureType | null) {
  if (tenureType === "buy") {
    return { min: 50000, max: 2000000, step: 10000, label: "Total budget (purchase)", format: (v: number) => v >= 1000000 ? `£${(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1)}M` : `£${(v / 1000).toFixed(0)}k` };
  }
  return { min: 200, max: 5000, step: 50, label: "Monthly budget (rent)", format: (v: number) => `£${v}/mo` };
}

export function BudgetSlider({ value, onChange, tenureType }: BudgetSliderProps) {
  const config = getBudgetConfig(tenureType);
  const currentValue = value ?? config.min;
  const [focused, setFocused] = useState(false);
  const [inputText, setInputText] = useState("");

  function handleFocus() {
    setFocused(true);
    setInputText(String(currentValue));
  }

  function handleBlur() {
    setFocused(false);
    const parsed = Number(inputText);
    if (!isNaN(parsed) && parsed >= config.min && parsed <= config.max) {
      onChange(parsed);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{config.label}</label>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={currentValue}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
        />
        <Input
          type="text"
          value={focused ? inputText : config.format(currentValue)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => setInputText(e.target.value)}
          className="w-28"
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{config.format(config.min)}</span>
        <span className="font-medium text-foreground">{config.format(currentValue)}</span>
        <span>{config.format(config.max)}</span>
      </div>
    </div>
  );
}
