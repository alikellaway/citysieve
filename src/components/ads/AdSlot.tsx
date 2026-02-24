import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { AdSlotPusher } from './AdSlotPusher';

const adSlotVariants = cva(
  'flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 text-muted-foreground mx-auto',
  {
    variants: {
      variant: {
        inline: 'h-[50px] w-[320px] sm:h-[90px] sm:w-[728px]',
        leaderboard: 'h-[50px] w-[320px] sm:h-[90px] sm:w-[728px] lg:w-[970px]',
        rectangle: 'h-[250px] w-[300px]',
      },
    },
    defaultVariants: {
      variant: 'inline',
    },
  }
);

const sizeLabels = {
  inline: { mobile: '320×50', tablet: '728×90', desktop: '728×90' },
  leaderboard: { mobile: '320×50', tablet: '728×90', desktop: '970×90' },
  rectangle: { mobile: '300×250', tablet: '300×250', desktop: '300×250' },
} as const;

// Slot IDs are baked into the bundle at Docker build time via NEXT_PUBLIC_* env vars.
const PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;
const SLOTS = {
  inline: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE,
  leaderboard: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD,
  rectangle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECTANGLE,
} as const;

interface AdSlotProps extends VariantProps<typeof adSlotVariants> {
  className?: string;
}

/**
 * AdSlot renders a Google AdSense ad unit when NEXT_PUBLIC_ADSENSE_PUB_ID and
 * the corresponding slot ID env var are set. Otherwise it falls back to a
 * placeholder box so the layout is unchanged in development.
 *
 * AdSlot is a server component. The browser-side adsbygoogle.push() call is
 * delegated to the AdSlotPusher client component rendered alongside the <ins>.
 */
export function AdSlot({ variant = 'inline', className }: AdSlotProps) {
  const resolvedVariant = variant ?? 'inline';
  const slotId = SLOTS[resolvedVariant];

  // Real AdSense path — only when both pub-ID and slot ID are configured.
  if (PUB_ID && slotId) {
    return (
      <div className={cn('my-6', className)} aria-label="advertisement">
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={PUB_ID}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        <AdSlotPusher />
      </div>
    );
  }

  // Placeholder fallback — shown in dev or when env vars are not configured.
  const labels = sizeLabels[resolvedVariant];
  return (
    <div className={cn('my-6', className)}>
      <div className={cn(adSlotVariants({ variant }))}>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider">
            Advertisement
          </p>
          <p className="mt-1 text-[10px] opacity-40 sm:hidden">
            {labels.mobile}
          </p>
          <p className="mt-1 hidden text-[10px] opacity-40 sm:block lg:hidden">
            {labels.tablet}
          </p>
          <p className="mt-1 hidden text-[10px] opacity-40 lg:block">
            {labels.desktop}
          </p>
        </div>
      </div>
    </div>
  );
}
