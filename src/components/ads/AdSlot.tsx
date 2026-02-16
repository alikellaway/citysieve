import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const adSlotVariants = cva(
  'flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 text-muted-foreground',
  {
    variants: {
      size: {
        banner: 'h-[90px] w-full max-w-[728px]',
        rectangle: 'h-[250px] w-full max-w-[300px]',
        leaderboard: 'h-[90px] w-full',
      },
    },
    defaultVariants: {
      size: 'banner',
    },
  }
);

interface AdSlotProps extends VariantProps<typeof adSlotVariants> {
  className?: string;
}

export function AdSlot({ size, className }: AdSlotProps) {
  return (
    <div className={cn('mx-auto my-6', className)}>
      <div className={cn(adSlotVariants({ size }))}>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider">
            Advertisement
          </p>
          <p className="mt-1 text-[10px] opacity-40">
            {size === 'banner' && '728 x 90'}
            {size === 'rectangle' && '300 x 250'}
            {size === 'leaderboard' && 'Full width x 90'}
          </p>
        </div>
      </div>
    </div>
  );
}
