'use client';

interface LoadingProgressBarProps {
  done: number;
  total: number;
  /** When true, renders an animated indeterminate bar instead of a percentage bar */
  indeterminate?: boolean;
}

export function LoadingProgressBar({ done, total, indeterminate = false }: LoadingProgressBarProps) {
  if (!indeterminate && total === 0) return null;

  if (indeterminate) {
    return (
      <div className="w-full bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex-1 relative">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 dark:from-indigo-400 dark:to-violet-400"
                style={{
                  width: '40%',
                  animationName: 'indeterminate-slide',
                  animationDuration: '1.4s',
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                }}
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground w-10 text-right">...</span>
        </div>
      </div>
    );
  }

  const percentage = Math.round((done / total) * 100);

  return (
    <div className="w-full bg-background/80 backdrop-blur-sm border-b">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex-1 relative">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 dark:from-indigo-400 dark:to-violet-400 transition-[width] duration-700 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          {done > 0 && done < total && (
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 dark:bg-violet-400 shadow-[0_0_10px_4px_rgba(139,92,246,0.55)] dark:shadow-[0_0_10px_4px_rgba(167,139,250,0.6)] transition-[left] duration-700 ease-out"
              style={{ left: `${percentage}%` }}
            />
          )}
        </div>
        <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
          {percentage}%
        </span>
      </div>
    </div>
  );
}
