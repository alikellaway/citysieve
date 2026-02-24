'use client';

interface LoadingProgressBarProps {
  done: number;
  total: number;
}

export function LoadingProgressBar({ done, total }: LoadingProgressBarProps) {
  if (total === 0) return null;

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
