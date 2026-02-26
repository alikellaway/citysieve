'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Poi, AmenityCategory } from '@/lib/poi-types';
import { CATEGORY_CONFIG, AMENITY_CATEGORIES } from '@/lib/poi-types';

interface AmenityGridProps {
  pois: Poi[];
  activeFilter: AmenityCategory | 'all';
  onFilterChange: (filter: AmenityCategory | 'all') => void;
}

export function AmenityGrid({ pois, activeFilter, onFilterChange }: AmenityGridProps) {
  const counts = useMemo(() => {
    const result: Record<AmenityCategory, number> = {
      supermarkets: 0,
      pubsBars: 0,
      restaurantsCafes: 0,
      parksGreenSpaces: 0,
      gymsLeisure: 0,
      healthcare: 0,
      librariesCulture: 0,
      schools: 0,
      trainStation: 0,
      busStop: 0,
    };
    for (const poi of pois) {
      result[poi.category]++;
    }
    return result;
  }, [pois]);

  const totalCount = pois.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {AMENITY_CATEGORIES.map((cat) => {
          const config = CATEGORY_CONFIG[cat];
          const count = counts[cat];
          const isActive = activeFilter === cat;
          
          return (
            <button
              key={cat}
              onClick={() => onFilterChange(isActive ? 'all' : cat)}
              className={cn(
                'flex flex-col items-center rounded-lg border p-2 transition-all',
                isActive
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <span className="text-lg">{config.icon}</span>
              <span className="text-xs font-medium text-muted-foreground truncate w-full text-center">
                {config.label.split(' ')[0]}
              </span>
              <span className={cn(
                'text-sm font-bold',
                isActive ? 'text-primary' : 'text-foreground'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onFilterChange('all')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            activeFilter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          All ({totalCount})
        </button>
        {AMENITY_CATEGORIES.map((cat) => {
          const config = CATEGORY_CONFIG[cat];
          const count = counts[cat];
          if (count === 0) return null;
          
          return (
            <button
              key={cat}
              onClick={() => onFilterChange(activeFilter === cat ? 'all' : cat)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                activeFilter === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {config.icon} {count}
            </button>
          );
        })}
      </div>
    </div>
  );
}
