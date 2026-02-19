'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ScoredArea } from '@/lib/scoring/engine';
import { cn } from '@/lib/utils';

interface ResultCardProps {
  result: ScoredArea;
  rank: number;
  isActive: boolean;
  onClick: () => void;
  onExplore: () => void;
}

const HIGHLIGHT_LABELS: Record<string, string> = {
  supermarkets: 'Supermarkets',
  highStreet: 'High street',
  pubsBars: 'Pubs & bars',
  restaurantsCafes: 'Dining out',
  parksGreenSpaces: 'Green spaces',
  gymsLeisure: 'Gyms & leisure',
  healthcare: 'Healthcare',
  librariesCulture: 'Culture',
  publicTransport: 'Public transport',
  trainStation: 'Train access',
  greenSpaces: 'Green spaces',
  peaceAndQuiet: 'Peace & quiet',
  commute: 'Short commute',
  familyProximity: 'Near family',
  socialScene: 'Social scene',
};

export function ResultCard({ result, rank, isActive, onClick, onExplore }: ResultCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-shadow hover:shadow-md',
        isActive && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {rank}
            </span>
            <CardTitle className="text-base">{result.area.name}</CardTitle>
          </div>
          <span className="text-lg font-bold text-primary">
            {Math.round(result.score)}%
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {result.highlights.map((h) => (
            <Badge key={h} variant="secondary">
              {HIGHLIGHT_LABELS[h] ?? h}
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <button
            className="text-sm font-medium text-primary underline underline-offset-2 hover:no-underline"
            onClick={(e) => { e.stopPropagation(); onExplore(); }}
          >
            Explore area →
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
