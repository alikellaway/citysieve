'use client';

import { Button } from '@/components/ui/button';

interface LoadingOverlayProps {
  areaName: string | null;
  phrase: string;
  viableCount?: number;
  doneCount?: number;
  totalCount?: number;
  isSkipping?: boolean;
  onSkip?: () => void;
}

const MIN_VIABLE = 2;
const MIN_PROGRESS_FRACTION = 0.25;

function estimateTotalViable(viableCount: number, doneCount: number, totalCount: number): number {
  if (doneCount <= 0 || totalCount <= 0) return viableCount;
  if (doneCount >= totalCount) return viableCount;
  
  const remaining = totalCount - doneCount;
  const projectedRate = viableCount / doneCount;
  const projected = Math.round(viableCount + projectedRate * remaining);
  
  return Math.max(viableCount, projected);
}

export function LoadingOverlay({
  areaName,
  phrase,
  viableCount = 0,
  doneCount = 0,
  totalCount = 0,
  isSkipping = false,
  onSkip,
}: LoadingOverlayProps) {
  const progressFraction = totalCount > 0 ? doneCount / totalCount : 0;
  const showSkip =
    !isSkipping &&
    viableCount >= MIN_VIABLE &&
    progressFraction >= MIN_PROGRESS_FRACTION;

  const estimatedTotal = estimateTotalViable(viableCount, doneCount, totalCount);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
      <div className="bg-background/90 backdrop-blur-md border rounded-xl shadow-lg px-6 py-4 min-w-[280px] max-w-[400px] pointer-events-auto">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">📍</span>
          <span className="font-medium text-sm truncate">
            {isSkipping ? 'Preparing your results...' : (areaName || 'Starting search...')}
          </span>
        </div>
        {phrase && !isSkipping && (
          <p className="text-xs text-muted-foreground italic">
            {phrase}
          </p>
        )}

        {(showSkip || isSkipping) && (
          <div className="pt-3 mt-2 border-t border-border/50">
            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs h-8"
              onClick={onSkip}
              disabled={isSkipping}
            >
              {isSkipping ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Wrapping up...
                </span>
              ) : (
                `Skip & view ${estimatedTotal} result${estimatedTotal !== 1 ? 's' : ''} \u2192`
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
