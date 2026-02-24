import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

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

interface AdSlotProps extends VariantProps<typeof adSlotVariants> {
  className?: string;
}

export function AdSlot({ variant = 'inline', className }: AdSlotProps) {
  const labels = sizeLabels[variant ?? 'inline'];

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
