'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ArrowRight } from 'lucide-react';
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
  const { breakdown, weights, nudgedCategories } = result;
  const nudgedSet = new Set(nudgedCategories);

  const activeDimensions = Object.keys(breakdown)
    .filter((key) => (weights[key as keyof typeof weights] ?? 0) > 0)
    .sort((a, b) => getWeightedContribution(b, weights, breakdown) - getWeightedContribution(a, weights, breakdown));

  if (activeDimensions.length === 0) return null;

  const hasNudges = activeDimensions.some((key) => nudgedSet.has(key));

  return (
    <div className="pt-2 pb-1 space-y-1.5">
      {activeDimensions.map((key) => {
        const score = breakdown[key];
        const isNudged = nudgedSet.has(key);
        const label = HIGHLIGHT_LABELS[key] ?? key;

        return (
          <div key={key} className="flex items-center gap-2">
            <div className="w-24 flex items-center gap-0.5 min-w-0">
              <span className="truncate text-xs text-muted-foreground">{label}</span>
              {isNudged && (
                <span
                  className="shrink-0 text-[9px] text-primary/60 leading-none"
                  title="Adjusted for your profile"
                >
                  ◆
                </span>
              )}
            </div>
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
      {hasNudges && (
        <p className="pt-1 text-[10px] text-muted-foreground/70">
          ◆ Adjusted for your profile
        </p>
      )}
    </div>
  );
}

export function ResultCard({ result, rank, isActive, isHovered, onClick, onHover, onLeave, onExplore }: ResultCardProps) {
  const rankColor = getRankColor(rank);
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        isActive && 'ring-2 ring-primary',
        isHovered && !isActive && 'ring-1 ring-primary/60'
      )}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <CardHeader className="p-4 pb-2">
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
          <span className="text-lg font-bold text-primary transition-transform duration-300 group-hover:scale-110">
            {Math.round(result.score)}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-wrap gap-1.5">
          {result.highlights.map((h) => (
            <Badge key={h} variant="secondary">
              {HIGHLIGHT_LABELS[h] ?? h}
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 justify-between text-xs text-muted-foreground hover:text-foreground group h-8"
            onClick={(e) => { e.stopPropagation(); setShowBreakdown(!showBreakdown); }}
          >
            Score breakdown
            <ChevronDown 
              className={cn(
                "h-4 w-4 transition-transform duration-300 ease-in-out group-hover:text-foreground",
                showBreakdown && "rotate-180"
              )} 
            />
          </Button>
          <Button
            size="sm"
            className="shrink-0 h-8 text-xs"
            onClick={(e) => { e.stopPropagation(); onExplore(); }}
          >
            Explore area
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
          
        <div 
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            showBreakdown ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0 mt-0"
          )}
        >
          <div className="overflow-hidden">
            <ScoreBreakdown result={result} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
