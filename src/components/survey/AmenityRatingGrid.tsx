"use client";

import type { LikertValue, LifestyleStep } from "@/lib/survey/types";
import { LikertScale } from "./LikertScale";

interface AmenityRatingGridProps {
  values: LifestyleStep;
  onChange: (key: keyof LifestyleStep, value: LikertValue) => void;
}

const AMENITY_LABELS: Record<keyof LifestyleStep, string> = {
  supermarkets: "Supermarkets & grocery shops",
  highStreet: "High street & retail shops",
  pubsBars: "Pubs and bars",
  restaurantsCafes: "Restaurants and cafes",
  parksGreenSpaces: "Parks and green spaces",
  gymsLeisure: "Gyms and leisure centres",
  healthcare: "Healthcare (GP, pharmacy, hospital)",
  librariesCulture: "Libraries and cultural venues",
};

export function AmenityRatingGrid({
  values,
  onChange,
}: AmenityRatingGridProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Rate how important proximity to each amenity is for you.
      </p>
      {(Object.keys(AMENITY_LABELS) as (keyof LifestyleStep)[]).map((key) => (
        <LikertScale
          key={key}
          label={AMENITY_LABELS[key]}
          value={values[key]}
          onChange={(v) => onChange(key, v)}
        />
      ))}
    </div>
  );
}
