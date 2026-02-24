'use client';

interface LoadingOverlayProps {
  areaName: string | null;
  phrase: string;
}

export function LoadingOverlay({ areaName, phrase }: LoadingOverlayProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
      <div className="bg-background/90 backdrop-blur-md border rounded-xl shadow-lg px-6 py-4 min-w-[280px] max-w-[400px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">📍</span>
          <span className="font-medium text-sm truncate">
            {areaName || 'Starting search...'}
          </span>
        </div>
        {phrase && (
          <p className="text-xs text-muted-foreground italic">
            {phrase}
          </p>
        )}
      </div>
    </div>
  );
}
