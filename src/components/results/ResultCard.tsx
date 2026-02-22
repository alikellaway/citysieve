'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ScoredArea } from '@/lib/scoring/engine';
import { HIGHLIGHT_LABELS } from '@/lib/scoring/labels';
import { cn } from '@/lib/utils';
import { getRankColor } from '@/components/results/rankColors';

interface ResultCardProps {
  result: ScoredArea;
  rank: number;
  isActive: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
  onExplore: () => void;
}

function getWeightedContribution(
  key: string,
  weights: ScoredArea['weights'],
  breakdown: Record<string, number>
): number {
  const weight = weights[key as keyof typeof weights] ?? 0;
  const score = breakdown[key] ?? 0;
  return weight * score;
}

function ScoreBreakdown({
  result,
}: {
  result: ScoredArea;
}) {
  const { breakdown, weights } = result;

  const activeDimensions = Object.keys(breakdown)
    .filter((key) => (weights[key as keyof typeof weights] ?? 0) > 0)
    .sort((a, b) => getWeightedContribution(b, weights, breakdown) - getWeightedContribution(a, weights, breakdown));

  if (activeDimensions.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      {activeDimensions.map((key) => {
        const score = breakdown[key];
        const weight = weights[key as keyof typeof weights] ?? 0;
        const label = HIGHLIGHT_LABELS[key] ?? key;

        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-24 truncate text-xs text-muted-foreground">{label}</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="w-8 text-xs text-muted-foreground text-right">{score}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function ResultCard({ result, rank, isActive, isHovered, onClick, onHover, onLeave, onExplore }: ResultCardProps) {
  const rankColor = getRankColor(rank);
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <Card
      className={cn(
        'cursor-pointer transition-shadow hover:shadow-md',
        isActive && 'ring-2 ring-primary',
        isHovered && !isActive && 'ring-1 ring-primary/60'
      )}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: rankColor }}
            >
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
        <button
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => { e.stopPropagation(); setShowBreakdown(!showBreakdown); }}
        >
          {showBreakdown ? '▲' : '▼'} Score breakdown
        </button>
        {showBreakdown && <ScoreBreakdown result={result} />}
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
