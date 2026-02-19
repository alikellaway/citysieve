'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { ScoredArea } from '@/lib/scoring/engine';

interface AreaInfoModalProps {
  area: ScoredArea | null;
  onClose: () => void;
}

const AWIN_ID = process.env.NEXT_PUBLIC_AWIN_ID;
const SPONSORED_URL = process.env.NEXT_PUBLIC_SPONSORED_URL;
const SPONSORED_LABEL = process.env.NEXT_PUBLIC_SPONSORED_LABEL;
const SPONSORED_TEXT = process.env.NEXT_PUBLIC_SPONSORED_TEXT;

const RIGHTMOVE_MID = '2047';
const ZOOPLA_MID = '2623';

function awinWrap(destUrl: string, merchantMid: string): string {
  if (!AWIN_ID) return destUrl;
  return `https://www.awin1.com/cread.php?awinmid=${merchantMid}&awinaffid=${AWIN_ID}&ued=${encodeURIComponent(destUrl)}`;
}

const ENVIRONMENT_LABELS: Record<string, string> = {
  city_centre: 'City centre',
  inner_suburb: 'Inner suburb',
  outer_suburb: 'Outer suburb',
  town: 'Town',
  rural: 'Rural',
};

export function AreaInfoModal({ area, onClose }: AreaInfoModalProps) {
  if (!area) return null;

  const { lat, lng } = area.area.coordinates;
  const name = area.area.name;
  const encodedName = encodeURIComponent(name);

  const links = [
    {
      label: 'Google Maps',
      url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    },
    {
      label: 'Street View',
      url: `https://www.google.com/maps/@${lat},${lng},3a,90y/`,
    },
    {
      label: 'Rightmove',
      url: awinWrap(
        `https://www.rightmove.co.uk/property-for-sale/find.html?searchLocation=${encodedName}`,
        RIGHTMOVE_MID
      ),
    },
    {
      label: 'Zoopla',
      url: awinWrap(
        `https://www.zoopla.co.uk/for-sale/property/uk/?q=${encodedName}`,
        ZOOPLA_MID
      ),
    },
    {
      label: 'Schools',
      url: `https://www.compare-school-performance.service.gov.uk/find-a-school-in-england?location=${encodedName}&lat=${lat}&lon=${lng}&range=3218`,
    },
    {
      label: 'Crime stats',
      url: `https://www.police.uk/pu/your-area/find-a-neighbourhood/?q=${encodedName}`,
    },
  ];

  return (
    <Dialog open={!!area} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl">{name}</DialogTitle>
            <span className="text-lg font-bold text-primary">
              {Math.round(area.score)}% match
            </span>
          </div>
        </DialogHeader>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="rounded bg-muted px-2 py-0.5">
            {ENVIRONMENT_LABELS[area.area.environment.type] ?? area.area.environment.type}
          </span>
          {area.area.commuteEstimate !== undefined && (
            <span className="rounded bg-muted px-2 py-0.5">
              ~{Math.round(area.area.commuteEstimate)} min commute
            </span>
          )}
        </div>

        {/* Resource links */}
        <div className="grid grid-cols-2 gap-2">
          {links.map(({ label, url }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {label} ↗
            </a>
          ))}
        </div>

        {/* Sponsored slot */}
        {SPONSORED_URL && (
          <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Sponsored</Badge>
              {SPONSORED_LABEL && (
                <span className="text-sm font-medium">{SPONSORED_LABEL}</span>
              )}
            </div>
            {SPONSORED_TEXT && (
              <p className="text-sm text-muted-foreground">{SPONSORED_TEXT}</p>
            )}
            <a
              href={SPONSORED_URL}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-2 inline-block text-sm font-medium text-primary underline underline-offset-2 hover:no-underline"
            >
              Learn more ↗
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
