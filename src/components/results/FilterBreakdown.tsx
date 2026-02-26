'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { AreaProfile } from '@/lib/scoring/engine';

interface FilterBreakdownProps {
  title: string;
  description: string;
  areas: AreaProfile[];
  defaultOpen?: boolean;
}

export function FilterBreakdown({
  title,
  description,
  areas,
  defaultOpen = false,
}: FilterBreakdownProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (areas.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-muted hover:bg-muted/80 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          <span className="text-muted-foreground">— {description}</span>
        </div>
        <Badge variant="secondary">{areas.length}</Badge>
      </button>

      {isOpen && (
        <div className="p-3 border-t">
          <ul className="space-y-1">
            {areas.map((area) => (
              <li
                key={area.id}
                className="text-sm flex justify-between items-center"
              >
                <span>{area.name}</span>
                {area.outcode && (
                  <span className="text-muted-foreground text-xs">
                    {area.outcode}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
