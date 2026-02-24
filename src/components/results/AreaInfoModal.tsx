'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, Home, Map, Search, GraduationCap, Shield, ExternalLink } from 'lucide-react';
import type { ScoredArea } from '@/lib/scoring/engine';
import { AmenityGrid } from './AmenityGrid';
import type { Poi, AmenityCategory } from '@/lib/poi-types';
import { AdSlot } from '@/components/ads/AdSlot';

const AreaModalMap = dynamic(
  () => import('./AreaModalMap').then((m) => m.AreaModalMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  }
);

const MODE_LABELS: Record<string, string> = {
  drive: 'Car',
  train: 'Train',
  bus: 'Bus',
  cycle: 'Cycling',
  walk: 'Walking',
};

interface AreaInfoModalProps {
  area: ScoredArea | null;
  onClose: () => void;
}

const AWIN_ID = process.env.NEXT_PUBLIC_AWIN_ID;
const SPONSORED_URL = process.env.NEXT_PUBLIC_SPONSORED_URL;
const SPONSORED_LABEL = process.env.NEXT_PUBLIC_SPONSORED_LABEL;
const SPONSORED_TEXT = process.env.NEXT_PUBLIC_SPONSORED_TEXT;
const ADSENSE_PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;

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

function AmenityGridSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center rounded-lg border border-border p-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="mt-1 h-3 w-10" />
            <Skeleton className="mt-1 h-4 w-4" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function AreaInfoModal({ area, onClose }: AreaInfoModalProps) {
  const [showCommuteBreakdown, setShowCommuteBreakdown] = useState(false);
  const [pois, setPois] = useState<Poi[]>([]);
  const [poisLoading, setPoisLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AmenityCategory | 'all'>('all');

  useEffect(() => {
    setShowCommuteBreakdown(false);
    setActiveFilter('all');
  }, [area?.area.id]);

  useEffect(() => {
    if (!area) {
      setPois([]);
      return;
    }

    const fetchPois = async () => {
      setPoisLoading(true);
      try {
        const { lat, lng } = area.area.coordinates;
        const res = await fetch(`/api/overpass/pois?lat=${lat}&lng=${lng}&radius=1000`);
        if (res.ok) {
          const data = await res.json();
          setPois(data);
        }
      } catch (err) {
        console.error('Failed to fetch POIs:', err);
      } finally {
        setPoisLoading(false);
      }
    };

    fetchPois();
  }, [area]);

  if (!area) return null;

  const { lat, lng } = area.area.coordinates;
  const name = area.area.name;
  const outcode = area.area.outcode;
  const searchLocation = outcode || name;
  const encodedLocation = encodeURIComponent(searchLocation);

  const resourceCategories = [
    {
      id: 'property',
      name: 'Property',
      links: [
        {
          label: 'Rightmove',
          url: awinWrap(
            `https://www.rightmove.co.uk/property-for-sale/find.html?searchLocation=${encodedLocation}`,
            RIGHTMOVE_MID
          ),
          icon: Home,
        },
        {
          label: 'Zoopla',
          url: awinWrap(
            `https://www.zoopla.co.uk/for-sale/property/uk/?q=${encodedLocation}`,
            ZOOPLA_MID
          ),
          icon: Home,
        },
      ],
    },
    {
      id: 'explore',
      name: 'Explore',
      links: [
        {
          label: 'Google Maps',
          url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
          icon: Map,
        },
        {
          label: 'Street View',
          url: `https://www.google.com/maps/@${lat},${lng},3a,90y/`,
          icon: Search,
        },
      ],
    },
    {
      id: 'data',
      name: 'Data',
      links: [
        {
          label: 'Schools',
          url: `https://www.compare-school-performance.service.gov.uk/find-a-school-in-england?location=${encodedLocation}&lat=${lat}&lon=${lng}&range=3218`,
          icon: GraduationCap,
        },
        {
          label: 'Crime stats',
          url: `https://www.police.uk/pu/your-area/find-a-neighbourhood/?q=${encodedLocation}`,
          icon: Shield,
        },
      ],
    },
  ];

  return (
    <Dialog open={!!area} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl">{name}</DialogTitle>
            <span className="text-lg font-bold text-primary">
              {Math.round(area.score)}% match
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-2">
            <span className="rounded bg-muted px-2 py-0.5">
              {ENVIRONMENT_LABELS[area.area.environment.type] ?? area.area.environment.type}
            </span>
            {area.area.commuteEstimate !== undefined && (
              <div>
                <button
                  className="rounded bg-muted px-2 py-0.5 transition-colors hover:bg-muted/70"
                  onClick={() => setShowCommuteBreakdown((v) => !v)}
                  aria-expanded={showCommuteBreakdown}
                >
                  ~{Math.round(area.area.commuteEstimate)} min commute{' '}
                  <span aria-hidden>{showCommuteBreakdown ? '▴' : '▾'}</span>
                </button>
                {showCommuteBreakdown && area.area.commuteBreakdown && (
                  <div className="mt-1.5 space-y-1 rounded bg-muted/60 px-2.5 py-2 text-xs">
                    {Object.entries(area.area.commuteBreakdown).map(([mode, mins]) => (
                      <div key={mode} className="flex justify-between gap-6">
                        <span className="text-muted-foreground">{MODE_LABELS[mode] ?? mode}</span>
                        <span className="tabular-nums">{Math.round(mins)} min</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex flex-col md:flex-row">
          <div className="h-[300px] md:h-[400px] md:w-1/2 relative">
            <AreaModalMap
              center={{ lat, lng }}
              pois={pois}
              activeFilter={activeFilter}
            />
            {poisLoading && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-[1000] rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Loading amenities...</span>
                </div>
              </div>
            )}
          </div>

          <div className="md:w-1/2 p-4 space-y-4 overflow-y-auto max-h-[400px]">
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                Local Amenities
                {poisLoading && (
                  <span className="text-xs text-muted-foreground font-normal animate-pulse">
                    Loading...
                  </span>
                )}
              </h3>
              {poisLoading ? (
                <AmenityGridSkeleton />
              ) : (
                <AmenityGrid
                  pois={pois}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                />
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Resources</h3>
              <Accordion type="single" defaultValue="property" collapsible className="w-full">
                {resourceCategories.map((category) => (
                  <AccordionItem key={category.id} value={category.id} className="border-none">
                    <AccordionTrigger className="py-2 hover:no-underline">
                      <span className="flex items-center gap-2">
                        {category.name}
                        <span className="text-xs bg-muted px-1.5 rounded text-muted-foreground">
                          {category.links.length}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1">
                      {category.links.map((link) => {
                        const Icon = link.icon;
                        return (
                          <a
                            key={link.label}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1">{link.label}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                          </a>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

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

            {/* Show AdSense rectangle only when no sponsored slot is configured */}
            {!SPONSORED_URL && ADSENSE_PUB_ID && (
              <div className="flex justify-center pt-2">
                <AdSlot variant="rectangle" />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
